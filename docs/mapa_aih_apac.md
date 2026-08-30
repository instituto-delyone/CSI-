# Mapeamento Governamental: AIH e APAC

Este documento estabelece a ponte de interoperabilidade entre a **Classificação Semiológica Institucional (CSI)** e os laudos exigidos pelo Sistema Único de Saúde (SUS).

## Lógica de Injeção
A arquitetura orientada a grafos do CSI permite que o dado clínico seja capturado uma única vez e distribuído de forma determinística para múltiplos formulários. O motor de renderização consulta as âncoras abaixo para o preenchimento oficial.

*   **Identificação (AIH/APAC):** Consomem integralmente o Domínio `000` (ex: `000.001.` para Nome Civil e `000.006.` para Procedência/Endereço).
*   **Sinais e Sintomas (AIH Bloco 20):** Alimenta-se das âncoras `002.001.` (Queixa Principal) e `002.002.` (História da Doença Atual).
*   **Justificativa de Internação (AIH Bloco 21):** Recebe a fusão de `003.001.` (Sinais Vitais) e `003.000.` (Exame Físico Geral e Segmentar).
*   **Diagnóstico e CID-10:** Mapeados estritamente para `004.001.` (Diagnóstico Nosológico Principal).
*   **Procedimentos (APAC):** Injeta códigos estruturados a partir da classe `006.003.` (Procedimentos Invasivos / Cirúrgicos).
