# CSI — Autoexpansão semântica controlada

## Objetivo

Permitir que o CSI pesquise um termo ausente em fontes científicas e gere uma **proposta de expansão**, sem transformar automaticamente uma evidência bibliográfica em equivalência semântica.

## Fluxo

```
entrada
  ↓
CSI exact match
  ├─ encontrou → âncora existente
  └─ não encontrou
        ↓
     NCBI / PubMed
        ↓
     evidências
        ↓
     proposta
        ↓
     código AUTO provisório
        ↓
     pending_review
        ↓
     revisão
        ↓
     dicionário canônico
```

## Por que o código AUTO é provisório?

Uma busca bibliográfica demonstra que um termo aparece na literatura; ela não demonstra, sozinha, que o termo deve ser fundido a uma âncora semântica existente.

Por isso o CSI separa:

- **evidência externa**;
- **candidato semântico**;
- **âncora canônica**.

O código `AUTO.XXXXXXXX` identifica o candidato de maneira determinística, mas não é uma âncora clínica oficial.

## Integração futura com GitHub

A aplicação pública **não deve conter token de escrita do GitHub**.

A arquitetura prevista é:

```
CSI Browser
    ↓
NCBI
    ↓
proposal
    ↓
backend/worker seguro
    ↓
GitHub API
    ↓
branch
    ↓
Pull Request
    ↓
revisão
    ↓
merge
```

O GitHub REST permite criar/atualizar arquivos com permissão `Contents: write`; o token deve permanecer fora do código público.

## Integração futura com Diagnosys

O CSI poderá fornecer ao Diagnosys:

```text
raw_text
  ↓
normalized_text
  ↓
semantic_anchor
  ↓
canonical_term
  ↓
clinical context
```

O Diagnosys poderá, por sua vez, devolver contexto clínico para desambiguar termos.

**Regra:** CSI normaliza linguagem; Diagnosys raciocina clinicamente. Uma âncora semântica não implica diagnóstico, causalidade ou gravidade.
