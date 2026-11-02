# Voxel World

Jogo sandbox voxel independente para desktop. O projeto usa Electron, Vite, React, React Router, Zustand, Three.js e TypeScript, seguindo a arquitetura em camadas do SDD `SDD_Jogo_Voxel_1_9.pdf`.

## Executar

```sh
npm install
npm start
```

O armazenamento nativo do Electron fica em `app.getPath('userData')/worlds`. No navegador, usado para desenvolvimento, os mundos ficam no armazenamento local do navegador.

## Validar

```sh
npm test
npx tsc --noEmit
npm run build
```

Os testes cobrem geração determinística, malha e UVs de chunks, tiles 16×16 e transparência das folhas, mira central e posicionamento de blocos, colisão e movimento do jogador, drops e coleta de itens, oxigênio e dano por afogamento, operações de inventário, receitas, salvamento atômico, backup e validação de caminhos.

## Arquitetura atual

- `src/domain`: geração determinística, catálogo declarativo, inventário e regras de crafting sem dependência de React ou Electron.
- `src/application`: casos de uso e armazenamento de mundos.
- `src/engine`: canvas Three.js, câmera em primeira pessoa, interação voxel e streaming de chunks.
- `src/domain/blockTextures.ts` e `src/engine/blockTextureAtlas.ts`: atlas procedural original 16×16 por tile, UVs por face e transparência recortada para folhas.
- `src/workers`: geração de malhas fora da thread da interface.
- `src/stores`: preferências e estado serializável da sessão.
- `src/pages`: menu, seleção/criação de mundos, configurações e interface do jogo.
- `src/style.css`: UI pixelada original, com controles, painéis, HUD e inventário inspirados na linguagem visual de jogos voxel.
- `electron`: janela isolada, preload tipado, IPC validado e persistência local com gravação atômica e backup.

O renderer não recebe acesso a Node.js. O preload expõe somente operações de mundo; IDs e payloads são validados no processo principal.

## Documentação para contribuidores

- [`docs/core/`](./docs/core/README.md): arquitetura, regras do núcleo, persistência e fluxo de contribuição.
- [`docs/api/`](./docs/api/README.md): contratos internos e guia para adicionar blocos, itens, receitas e texturas.

## Aderência ao SDD

O SDD descreve um produto de grande porte e recomenda explicitamente validar um vertical slice antes de ampliar o conteúdo. Esta versão reconstrói a fundação e inicia esse slice; não representa paridade completa com Minecraft 1.9.

| Requisito | Situação nesta versão |
|---|---|
| RF-001, RF-002 | Implementados: criar, listar, abrir, renomear e excluir mundos locais. |
| RF-003, RF-004 | Parciais: seed reproduzível, terreno procedural, chunks 16×16, geração em worker e distância configurável; biomas, fila de prioridade e limites de memória ainda precisam de expansão. |
| RF-005 | Parcial: quebrar e colocar blocos com mira central, alcance, colisão e ferramenta; drops têm gravidade, colisão, rotação e coleta pelo inventário; faltam progresso de mineração, estados/orientações e fluidos. |
| RF-006 | Parcial: jogador, alterações de blocos e itens dropados com velocidade salvos em arquivo versionado, gravação atômica e backup; ainda não há arquivos por região/chunk. |
| RF-007, RF-008 | Parciais: inventário empilhável, hotbar, movimentação/divisão de stacks, drops de bloco coletáveis e descarte manual; armadura e mão secundária ainda não têm ciclo completo. |
| RF-009 | Parcial: receitas 2×2 no inventário e 3×3 ao interagir com uma bancada; forno, sobras e receitas avançadas não estão implementados. |
| RF-010, RF-011 | Parciais: vida, fome, oxigênio subaquático, dano por fome/afogamento e relógio do mundo; faltam armadura/XP/efeitos, clima e regras de spawn. |
| RF-012 a RF-016 | Pendentes: entidades/IA, combate completo, encantamentos/poções, Nether/End e redstone. |
| RF-017, RF-018 | Parciais: voo, catálogo e invulnerabilidade Criativa; tela de morte e reaparecimento básico, sem cama, drops ou hardcore. |
| RF-019, RF-020 | Parciais: pausa, preferências locais e autosave periódico/manual; falta integração completa de áudio, vídeo, acessibilidade e encerramento seguro do processo. |
| RF-021 a RF-024 | Parciais: remapeamento de teclado, HUD e distância de renderização; mouse, qualidade gráfica e diagnóstico de desempenho ainda não estão completos. |
| RF-025 a RF-027 | Não iniciados; permanecem opcionais/futuros conforme o SDD. |

As fases de entidades, conteúdo 1.9, dimensões, redstone e polimento permanecem como expansão de produto, e não são anunciadas como concluídas.
