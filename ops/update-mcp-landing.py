#!/usr/bin/env python3
"""Prepare the MCP landing-page amendments; deployment installs the output separately."""
import argparse
from pathlib import Path


def amend(text):
    languages = {
        'en': {
            'features': ' Supports MCP 2026-07-28 and older clients. Compatible hosts can browse articles and videos, use the digital-nomad income calculator, and load five public workflow skills.',
            'headers': 'For browser connectors, allow POST and OPTIONS with Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, MCP-Session-Id, and Last-Event-ID headers. Browser origins must be explicitly allowed by the server.',
            'search': 'Searches published Legal Fournier articles and linked YouTube video metadata by topic. Articles can also be filtered by language.',
            'fetch': 'Returns an article or video record with its canonical URL and source context. Videos do not include verified transcripts.',
            'get_paid_consultation_options': 'Lists paid consultation formats and current purchase paths without placing an order.',
            'get_paid_call_availability': 'Checks available consultation times without making a booking.',
        },
        'es': {
            'features': ' Compatible con MCP 2026-07-28 y clientes anteriores. Las plataformas compatibles permiten explorar artículos y vídeos, usar la calculadora de ingresos para nómadas digitales y cargar cinco skills públicas para agentes.',
            'headers': 'Para conectores de navegador, permite POST y OPTIONS con las cabeceras Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, MCP-Session-Id y Last-Event-ID. El servidor debe permitir expresamente el origen del navegador.',
            'search': 'Busca artículos publicados de Legal Fournier y datos de sus vídeos de YouTube por tema. Los artículos también se pueden filtrar por idioma.',
            'fetch': 'Devuelve un artículo o ficha de vídeo con su URL canónica y contexto de fuentes. Los vídeos no incluyen transcripciones verificadas.',
            'get_paid_consultation_options': 'Muestra los formatos de consulta de pago y sus vías de compra actuales sin realizar un pedido.',
            'get_paid_call_availability': 'Consulta los horarios disponibles sin reservar una cita.',
        },
        'fr': {
            'features': ' Compatible avec MCP 2026-07-28 et les anciens clients. Les plateformes compatibles permettent de parcourir articles et vidéos, de calculer le seuil de revenus pour nomades numériques et de charger cinq skills publiques pour agents.',
            'headers': 'Pour les connecteurs navigateur, autorisez POST et OPTIONS avec les en-têtes Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, MCP-Session-Id et Last-Event-ID. Le serveur doit autoriser explicitement l’origine du navigateur.',
            'search': 'Recherche les articles publiés de Legal Fournier et les métadonnées de leurs vidéos YouTube par sujet. Les articles peuvent aussi être filtrés par langue.',
            'fetch': 'Renvoie un article ou une fiche vidéo avec son URL canonique et le contexte des sources. Les vidéos ne contiennent pas de transcription vérifiée.',
            'get_paid_consultation_options': 'Présente les formats de consultation payante et les parcours d’achat actuels sans passer de commande.',
            'get_paid_call_availability': 'Consulte les créneaux disponibles sans réserver de rendez-vous.',
        },
    }
    if 'MCP 2026-07-28' in text:
        raise ValueError('Landing page is already amended; inspect rather than applying twice.')
    for lang, copy in languages.items():
        start = text.index("    '" + lang + "' => array(\n", text.index('$copy = array('))
        end = text.index('\n    ),', start)
        block = text[start:end]
        lines = block.splitlines()
        for index, line in enumerate(lines):
            if "'workflow_intro' =>" in line:
                assert line.endswith("',")
                lines[index] = line[:-2] + copy['features'].replace("'", "\\'") + "',"
            if 'Content-Type, Accept, MCP-Protocol-Version' in line:
                lines[index] = "            '" + copy['headers'].replace("'", "\\'") + "',"
        block = '\n'.join(lines)
        anchor = "        'tool_cards' => array(\n"
        cards = ''.join("            array('name' => '" + name + "', 'body' => '" + copy[name].replace("'", "\\'") + "'),\n"
                        for name in ('search', 'fetch', 'get_paid_consultation_options', 'get_paid_call_availability'))
        assert block.count(anchor) == 1
        block = block.replace(anchor, anchor + cards, 1)
        text = text[:start] + block + text[end:]
    assert text.count('Mcp-Method, Mcp-Name') == 3
    assert text.count("'name' => 'search'") == 3
    return text


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        parser.error('Use a separate output file so deployment can preserve permissions and ACLs.')
    args.output.write_text(amend(args.source.read_text()), encoding='utf-8')
