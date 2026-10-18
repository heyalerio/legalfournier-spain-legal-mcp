<?php
// Isolated tests. No WordPress, database, network, or mail delivery is loaded.
class WP_REST_Request {
    public $payload;
    public $key;
    function __construct($payload, $key = 'test-operation-0001') {$this->payload=$payload; $this->payload['idempotency_key']=$key; $this->key=$key;}
    function get_body() {return json_encode($this->payload);}
    function get_header($name) {return $name === 'x-lf-agent-idempotency-key' ? $this->key : 'signed';}
}
class WP_REST_Response {
    public $data; public $status; public $headers;
    function __construct($data,$status=200,$headers=array()) {$this->data=$data;$this->status=$status;$this->headers=$headers;}
    function get_status() {return $this->status;}
}
class FakeDb {
    public $options='options'; public $prefix='wp_'; public $rows=array(); public $busy=false; public $release=0; public $entry=0;
    function prepare($query,...$args) {return array($query,$args);}
    function get_var($query) {
        [$sql,$args]=$query;
        if (str_contains($sql,'GET_LOCK')) return $this->busy ? '0' : '1';
        if (str_contains($sql,'RELEASE_LOCK')) {$this->release++; return '1';}
        if (str_contains($sql,'lf_form_entries'))return $this->entry;
        return $this->rows[$args[0]] ?? null;
    }
    function insert($table,$row,$format) {
        if (isset($this->rows[$row['option_name']]))return false;
        $this->rows[$row['option_name']]=$row['option_value'];return 1;
    }
    function update($table,$row,$where,...$format) {$this->rows[$where['option_name']]=$row['option_value'];return 1;}
    function delete($table,$where,$format) {unset($this->rows[$where['option_name']]);return 1;}
    function query($query) {
        [$sql,$args]=$query;
        if (str_starts_with($sql,'UPDATE')) {
            [$next,$key,$previous]=$args;
            if (($this->rows[$key]??null)!==$previous)return 0;
            $this->rows[$key]=$next;return 1;
        }
        [$key,$previous]=$args;
        if (($this->rows[$key]??null)!==$previous)return 0;
        unset($this->rows[$key]);return 1;
    }
}
function wp_json_encode($x){return json_encode($x);}
function get_transient($x){return $GLOBALS['legacy'] ?? false;}
function lf_verify_agent_lead_signature(...$args){return $GLOBALS['valid_signature'];}
function lf_agent_lead_idempotency_key($request,$payload){return preg_match('/^[A-Za-z0-9_.:-]{8,160}$/',$request->key) ? $request->key : '';}
function lf_process_agent_lead($request,$operation){
    $GLOBALS['calls']++;
    if ($GLOBALS['mode']==='reject')return new WP_REST_Response(array('ok'=>false),400);
    if ($GLOBALS['mode']==='crash_before')throw new RuntimeException('simulated');
    lf_agent_lead_operation_claim($operation);
    if ($GLOBALS['mode']==='crash_inserting')throw new RuntimeException('simulated');
    $response=array('ok'=>true,'entry_id'=>42,'lead_id'=>'mock-lead');
    lf_agent_lead_operation_save($operation,$response);
    if ($GLOBALS['mode']==='crash_after')throw new RuntimeException('simulated');
    $GLOBALS['notifications']++;
    return new WP_REST_Response($response,201);
}
require __DIR__.'/wordpress-agent-idempotency.php';
function check($condition,$label){if(!$condition)throw new RuntimeException($label);$GLOBALS['checks']++;}
function reset_case(){ $GLOBALS['wpdb']=new FakeDb();$GLOBALS['calls']=0;$GLOBALS['notifications']=0;$GLOBALS['mode']='normal';$GLOBALS['legacy']=false;$GLOBALS['valid_signature']=true;}
$checks=0;reset_case();
$payload=array('name'=>'Mock','email'=>'mock@example.invalid','case_summary'=>'test','confirmed_consent'=>true,'consent_to_contact'=>true);
$req=new WP_REST_Request($payload);
check(lf_handle_agent_lead($req)->status===201,'initial accepted');
check(lf_handle_agent_lead($req)->status===200,'retry cached');
check($calls===1 && $notifications===1,'exactly one process and notification');
$other=$payload;$other['case_summary']='different';
check(lf_handle_agent_lead(new WP_REST_Request($other))->status===409,'key bound to payload');
$other=$payload;$other['request_ip_hash']='another-proxy';$other['agent_caller_ip']='192.0.2.2';
check(lf_handle_agent_lead(new WP_REST_Request($other))->status===200,'dynamic telemetry excluded');
check($wpdb->release===4,'lock released after all outcomes');
reset_case();$wpdb->busy=true;check(lf_handle_agent_lead($req)->status===503 && $calls===0,'concurrent request blocked');
reset_case();$mode='crash_after';check(lf_handle_agent_lead($req)->status===201,'accepted response recovered after notification failure');
check(lf_handle_agent_lead($req)->status===200 && $calls===1,'post-crash retry does not create duplicate');
reset_case();$mode='crash_before';check(lf_handle_agent_lead($req)->status===503,'unknown outcome guarded');
$mode='normal';check(lf_handle_agent_lead($req)->status===201 && $calls===2,'pre-insert failure safely retried');
reset_case();$mode='crash_inserting';check(lf_handle_agent_lead($req)->status===503,'ambiguous insertion guarded');
check(lf_handle_agent_lead($req)->status===503 && $calls===1,'no blind retry after unknown outcome');
$wpdb->entry=42;check(lf_handle_agent_lead($req)->status===200 && $calls===1,'persisted lead recovered after insert-response crash');
reset_case();$mode='reject';check(lf_handle_agent_lead($req)->status===400 && count($wpdb->rows)===0,'validation failures release reservation');
reset_case();$valid_signature=false;check(lf_handle_agent_lead($req)->status===401 && $calls===0,'signature gate unchanged');
reset_case();check(lf_handle_agent_lead(new WP_REST_Request($payload,'bad'))->status===400,'invalid key rejected');
reset_case();$mismatch=new WP_REST_Request($payload);$mismatch->key='different-header-key';check(lf_handle_agent_lead($mismatch)->status===400 && $calls===0,'unsigned header cannot change signed operation key');
reset_case();$legacy=array('entry_id'=>42);check(lf_handle_agent_lead($req)->status===409 && $calls===0,'legacy accepted requests not replayed');
$replacement=file_get_contents(__DIR__.'/wordpress-agent-handler.replacement.txt');
check(strpos($replacement,'lf_agent_lead_operation_save($operation, $response)') < strpos($replacement,'lf_send_entry_email'),'durable result precedes internal mail');
check(strpos($replacement,'lf_agent_lead_operation_save($operation, $response)') < strpos($replacement,'lf_send_agent_lead_autoresponse'),'durable result precedes autoresponse');
check(strpos($replacement,'lf_agent_lead_operation_claim($operation)') < strpos($replacement,'$entry_id = lf_insert_form_entry'),'exclusive claim persisted before insertion');
reset_case();$operation=array('option_name'=>'test-cas','payload_hash'=>'hash','phase'=>'reserved','created_at'=>time(),'lead_id'=>'agent_mock');$wpdb->rows['test-cas']=json_encode($operation);
lf_agent_lead_operation_claim($operation);$failed=false;try{lf_agent_lead_operation_claim($operation);}catch(RuntimeException $e){$failed=true;}check($failed,'second worker cannot claim insertion after reconnect');
lf_agent_lead_release_reserved($operation);check(isset($wpdb->rows['test-cas']),'stale worker cannot delete claimed reservation');
echo "$checks isolated idempotency checks passed\n";
