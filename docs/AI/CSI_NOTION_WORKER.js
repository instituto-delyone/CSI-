/**
 * CSI -> Notion Proposal Worker
 *
 * Recebe uma proposta do CSI Explorer e cria uma página filha no Notion
 * com status pending_review. A promoção para o dicionário canônico
 * continua sendo uma decisão humana/manual.
 *
 * Cloudflare:
 * - Secret: NOTION_TOKEN
 * - Variable: NOTION_CSI_PARENT_PAGE_ID
 * - Optional variable: CSI_ALLOWED_ORIGIN
 *
 * Endpoint: POST /api/csi/proposal
 */

const NOTION_VERSION = "2022-06-28";

function corsHeaders(origin, env) {
  const allowed = env.CSI_ALLOWED_ORIGIN || origin || "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Vary": "Origin"
  };
}

function json(data, status, origin, env) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, env)
    }
  });
}

function text(value, fallback) {
  const valueText = String(value == null ? "" : value).trim();
  return valueText || (fallback || "—");
}

function richText(content) {
  return [{ type: "text", text: { content: String(content).slice(0, 1900) } }];
}

function paragraph(content) {
  return { object: "block", type: "paragraph", paragraph: { rich_text: richText(content) } };
}

function heading(content) {
  return { object: "block", type: "heading_2", heading_2: { rich_text: richText(content) } };
}

function bullets(items) {
  const values = Array.isArray(items) ? items : [];
  return values.slice(0, 20).map(item => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: richText(text(item)) }
  }));
}

function buildBlocks(proposal) {
  const blocks = [
    heading("Estado da proposta"),
    paragraph("Status: pending_review"),
    paragraph("Esta proposta foi descoberta pelo UMLS e permanece aguardando revisão/aceite. Ela não altera o dicionário canônico automaticamente."),
    heading("Termo recebido"),
    paragraph("Termo original: " + text(proposal.termo_original)),
    paragraph("Nome canônico provisório: " + text(proposal.nome_canonico_provisorio)),
    paragraph("Código provisório / âncora: " + text(proposal.codigo_provisorio)),
    paragraph("Tipo: " + text(proposal.tipo)),
    heading("UMLS"),
    paragraph("CUI: " + text(proposal.origem && proposal.origem.cui)),
    paragraph("Fonte: " + text(proposal.origem && proposal.origem.rootSource)),
    paragraph("Consulta: " + text(proposal.origem && proposal.origem.query)),
    heading("Sinônimos / variantes recuperadas")
  ];
  blocks.push(...(proposal.sinonimos && proposal.sinonimos.length ? bullets(proposal.sinonimos) : [paragraph("Nenhum sinônimo adicional retornado pela UMLS.")]));
  blocks.push(heading("Correspondência CSI existente"));
  if (proposal.correspondencia_csi) {
    blocks.push(paragraph(text(proposal.correspondencia_csi.canonicalName) + " -> " + text(proposal.correspondencia_csi.anchor)));
  } else {
    blocks.push(paragraph("Nenhuma âncora existente encontrada."));
  }
  blocks.push(heading("Evidências PubMed"));
  if (Array.isArray(proposal.evidencias) && proposal.evidencias.length) {
    blocks.push(...proposal.evidencias.slice(0, 5).map(item => paragraph(text(item.title) + " - " + text(item.url))));
  } else {
    blocks.push(paragraph("Nenhuma evidência PubMed anexada."));
  }
  blocks.push(heading("Decisão humana"));
  blocks.push(paragraph("ACEITAR / PROMOVER -> revisão manual"));
  blocks.push(paragraph("REJEITAR -> manter fora do dicionário"));
  blocks.push(paragraph("CORRIGIR -> ajustar termo, sinônimos ou âncora antes da promoção"));
  blocks.push(paragraph("Regra do CSI: UMLS é fonte de descoberta; a decisão semântica permanece sob revisão humana."));
  return blocks;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/api/csi/proposal") {
      return json({ error: "Not found" }, 404, origin, env);
    }

    if (!env.NOTION_TOKEN || !env.NOTION_CSI_PARENT_PAGE_ID) {
      return json({ error: "Configure NOTION_TOKEN e NOTION_CSI_PARENT_PAGE_ID no Worker." }, 500, origin, env);
    }

    let body;
    try { body = await request.json(); } catch (_) {
      return json({ error: "JSON inválido." }, 400, origin, env);
    }

    const proposal = body && body.proposal;
    if (!proposal || !proposal.proposal_id || !proposal.termo_original) {
      return json({ error: "Proposta incompleta." }, 400, origin, env);
    }

    const title = "CSI " + text(proposal.proposal_id) + " - " + text(proposal.termo_original);
    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.NOTION_TOKEN,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION
      },
      body: JSON.stringify({
        parent: { page_id: env.NOTION_CSI_PARENT_PAGE_ID },
        properties: { title: { title: [{ text: { content: title.slice(0, 200) } }] } },
        children: buildBlocks(proposal).slice(0, 100)
      })
    });

    if (!notionResponse.ok) {
      const detail = await notionResponse.text();
      return json({ error: "Notion recusou a criação da página.", detail }, 502, origin, env);
    }

    const page = await notionResponse.json();
    return json({ ok: true, page_id: page.id, url: page.url, status: "pending_review" }, 201, origin, env);
  }
};