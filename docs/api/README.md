# API e contratos do projeto

Este diretório documenta os contratos TypeScript usados para estender o jogo. Eles são APIs internas do projeto, não uma API pública versionada: mudanças em formatos persistidos devem considerar os saves existentes e a validação do Electron.

## Contratos principais

- [Dados de mundo e saves](../core/README.md#dados-e-persistência): `WorldManifest`, `WorldSnapshot`, `StoredWorld`, `ItemStack` e `DroppedItemSnapshot` em `src/domain/world.ts`. Drops usam `velocity` para persistir o movimento físico.
- [Catálogo de conteúdo](./content.md): `BlockDefinition`, `ItemDefinition`, `BLOCKS`, `ITEMS`, `blockById` e `itemById` em `src/domain/content.ts`.
- [Receitas](./content.md#adicionar-uma-receita): `Recipe`, `RECIPES`, `findCraftingRecipe`, `craft` e `smelt` em `src/domain/recipes.ts`.
- [Texturas](./content.md#adicionar-uma-textura-de-bloco): IDs e mapeamento de faces em `src/domain/blockTextures.ts`; atlas procedural em `src/engine/blockTextureAtlas.ts`.
- [Inventário](../core/README.md#regras-de-domínio): operações puras em `src/domain/inventory.ts`.

## Regras de compatibilidade

1. Prefira funções puras em `src/domain` para regras que não dependem de React, Three.js ou Electron.
2. Estado durável do jogo pertence a `WorldSnapshot`; estado de interface temporário pertence a `src/stores`.
3. Ao adicionar campos persistidos, atualize a inicialização em `createInitialSnapshot` e a validação em `electron/worldStorage.ts`. Campos opcionais devem ter um valor de compatibilidade para saves antigos.
4. IDs de itens e blocos devem ser minúsculos e usar apenas letras ASCII, números e `_`, conforme o validador de saves.
5. Cada regra nova precisa de teste em `tests/` e inclusão no runner `tests/run.ts`.

Veja [como contribuir com conteúdo](./content.md) para os passos completos de blocos, itens, receitas e texturas.
