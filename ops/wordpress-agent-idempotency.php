<?php
// Included by the core plugin immediately before lf_handle_agent_lead.
// Records contain only a request digest and the accepted lead response, never the submitted case.
function lf_agent_lead_request_digest($payload) {
    $fields = array(
        'name', 'email', 'phone', 'preferred_language', 'legal_area', 'case_summary',
        'agent_handoff_message', 'urgency', 'confirmed_consent', 'consent_to_contact',
        'risk_flags', 'missing_facts', 'related_resource_uris', 'tool_context',
    );
    $bound = array();
    foreach ($fields as $field) {
        $bound[$field] = $payload[$field] ?? null;
    }
    return hash('sha256', wp_json_encode($bound));
}

function lf_agent_lead_operation_record($option_name) {
    global $wpdb;
    $raw = $wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $option_name));
    return $raw === null ? null : json_decode($raw, true);
}

function lf_agent_lead_operation_save($operation, $response) {
    global $wpdb;
    $record = array('payload_hash' => $operation['payload_hash'], 'created_at' => $operation['created_at'], 'lead_id' => $operation['lead_id'], 'phase' => $response === null ? ($operation['phase'] ?? 'reserved') : 'accepted', 'response' => $response);
    $saved = $wpdb->update($wpdb->options, array('option_value' => wp_json_encode($record)), array('option_name' => $operation['option_name']), array('%s'), array('%s'));
    if ($saved === false || ($saved === 0 && lf_agent_lead_operation_record($operation['option_name']) !== $record)) {
        throw new RuntimeException('Unable to persist agent operation result.');
    }
}

function lf_agent_lead_operation_claim($operation) {
    global $wpdb;
    $raw = $wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $operation['option_name']));
    $record = json_decode((string) $raw, true);
    if (!is_array($record) || ($record['phase'] ?? '') !== 'reserved' || !hash_equals($record['payload_hash'], $operation['payload_hash'])) {
        throw new RuntimeException('Agent operation cannot be claimed.');
    }
    $record['phase'] = 'inserting';
    // GET_LOCK can disappear if wpdb reconnects. This compare-and-swap remains
    // exclusive even after reconnect, so only one worker may insert the lead.
    $claimed = $wpdb->query($wpdb->prepare("UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND option_value = %s", wp_json_encode($record), $operation['option_name'], $raw));
    if ($claimed !== 1) {
        throw new RuntimeException('Agent operation was claimed by another worker.');
    }
}

function lf_agent_lead_release_reserved($operation) {
    global $wpdb;
    $raw = $wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $operation['option_name']));
    $record = json_decode((string) $raw, true);
    if (is_array($record) && ($record['phase'] ?? '') === 'reserved' && hash_equals($record['payload_hash'], $operation['payload_hash'])) {
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", $operation['option_name'], $raw));
    }
}

function lf_handle_agent_lead(WP_REST_Request $request) {
    global $wpdb;
    $body = (string) $request->get_body();
    if (!lf_verify_agent_lead_signature($body, $request->get_header('x-lf-agent-timestamp'), $request->get_header('x-lf-agent-signature'))) {
        return new WP_REST_Response(array('ok' => false, 'message' => 'Invalid agent lead signature.'), 401);
    }
    $payload = json_decode($body, true);
    if (!is_array($payload)) {
        return new WP_REST_Response(array('ok' => false, 'message' => 'Invalid JSON payload.'), 400);
    }
    $key = lf_agent_lead_idempotency_key($request, $payload);
    if ($key === '' || !isset($payload['idempotency_key']) || !is_string($payload['idempotency_key']) || !hash_equals($payload['idempotency_key'], $key)) {
        return new WP_REST_Response(array('ok' => false, 'message' => 'The idempotency key must match the key in the signed request body.'), 400);
    }
    $key_hash = hash('sha256', $key);
    $lock_name = 'lfagent:' . substr($key_hash, 0, 56);
    if ((string) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $lock_name)) !== '1') {
        return new WP_REST_Response(array('ok' => false, 'code' => 'operation_in_progress', 'message' => 'This request is already being processed. Retry with the same key.'), 503, array('Retry-After' => '5'));
    }
    $operation = array('option_name' => 'lf_agent_operation_' . $key_hash, 'payload_hash' => lf_agent_lead_request_digest($payload), 'created_at' => time(), 'lead_id' => 'agent_' . substr($key_hash, 0, 24), 'phase' => 'reserved');
    try {
        $existing = lf_agent_lead_operation_record($operation['option_name']);
        if (is_array($existing)) {
            if (!isset($existing['payload_hash']) || !hash_equals($existing['payload_hash'], $operation['payload_hash'])) {
                return new WP_REST_Response(array('ok' => false, 'code' => 'idempotency_conflict', 'message' => 'This idempotency key belongs to a different request.'), 409);
            }
            if (!empty($existing['response']['entry_id'])) {
                $response = $existing['response'];
                $response['duplicate'] = true;
                return new WP_REST_Response($response, 200);
            }
            // Recover the narrow crash window between inserting the lead and
            // storing its response, without sending either notification twice.
            $entry_id = (int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$wpdb->prefix}lf_form_entries WHERE lead_id = %s ORDER BY id ASC LIMIT 1", $operation['lead_id']));
            if ($entry_id > 0) {
                $response = array('ok' => true, 'entry_id' => $entry_id, 'lead_id' => $operation['lead_id'], 'lead_status' => 'created', 'notification_status' => 'needs_reconciliation', 'duplicate' => true);
                lf_agent_lead_operation_save($operation, $response);
                return new WP_REST_Response($response, 200);
            }
            if (($existing['phase'] ?? '') !== 'reserved') {
                return new WP_REST_Response(array('ok' => false, 'code' => 'operation_outcome_unknown', 'message' => 'This request needs recovery. Keep the same key; do not submit a new request.'), 503, array('Retry-After' => '60'));
            }
            $operation['created_at'] = $existing['created_at'];
        }
        $legacy = get_transient('lf_agent_lead_idem_' . $key_hash);
        if (is_array($legacy) && !empty($legacy['entry_id'])) {
            return new WP_REST_Response(array('ok' => false, 'code' => 'legacy_operation_requires_recovery', 'message' => 'This request was already accepted before the retry upgrade. Do not submit it again.'), 409);
        }
        // Unique option_name plus the database lock protects simultaneous submissions.
        // Persist the guard before creating a lead: a crash must never allow a blind duplicate.
        if (!is_array($existing)) {
            $inserted = $wpdb->insert($wpdb->options, array('option_name' => $operation['option_name'], 'option_value' => wp_json_encode($operation), 'autoload' => 'no'), array('%s', '%s', '%s'));
            if ($inserted !== 1) {
                return new WP_REST_Response(array('ok' => false, 'message' => 'Unable to reserve this request.'), 503);
            }
        }
        $response = lf_process_agent_lead($request, $operation);
        if ($response->get_status() < 500 && $response->get_status() >= 400) {
            // Input and rate-limit rejections happen before lead insertion.
            lf_agent_lead_release_reserved($operation);
        }
        return $response;
    } catch (Throwable $error) {
        // A saved result remains recoverable even if notification delivery fails afterwards.
        $existing = lf_agent_lead_operation_record($operation['option_name']);
        if (!empty($existing['response']['entry_id'])) {
            return new WP_REST_Response($existing['response'], 201);
        }
        return new WP_REST_Response(array('ok' => false, 'code' => 'operation_outcome_unknown', 'message' => 'The request outcome is pending recovery. Keep the same idempotency key.'), 503, array('Retry-After' => '60'));
    } finally {
        $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock_name));
    }
}
