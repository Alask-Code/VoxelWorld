# Estendendo o catálogo de conteúdo

Os registros do catálogo são declarativos e ficam em `src/domain/content.ts`. Preserve essa separação: domínio descreve dados e regras; renderer apresenta o conteúdo.

## Adicionar bloco ou item

1. Adicione o bloco a `BLOCKS` com um ID único, `numericId`, nome, dureza, cor, tags de ferramenta, drops e propriedade `solid`.
2. Blocos sólidos que podem ser colocados geram automaticamente um `ItemDefinition` a partir do bloco, exceto `grass`, `water` e `leaves`. Para um item que não representa um bloco, adicione uma entrada própria em `ITEMS`.
3. Se o item coloca um bloco diferente do seu próprio ID (por exemplo, `cobblestone` coloca `stone`), defina `placeBlock`.
4. Itens empilháveis usam `maxStack`; ferramentas devem usar `maxStack: 1` e, quando aplicável, `durability`.
5. Os drops do bloco são IDs de item. Para exigir ferramenta, preencha `toolTags`; a mineração verifica se o ID da ferramenta selecionada contém a tag.
6. Adicione ou atualize testes para catálogo, mineração, posicionamento e inventário conforme o comportamento novo.

As ferramentas de madeira disponíveis são espada, picareta, machado, rastelo e pá. Todas têm modelos visíveis na mão em primeira pessoa, possuem durabilidade (`damage` no stack), perdem um ponto ao quebrar um bloco no modo Sobrevivência e quebram ao atingir o limite. As receitas ficam declaradas em `RECIPES`.

Exemplo de bloco:

```ts
{
  id: 'copper_ore',
  numericId: 14,
  name: 'Minério de cobre',
  hardness: 3,
  color: '#b8734f',
  toolTags: ['pickaxe'],
  drops: ['copper_ore'],
  solid: true
}
```

Registre o item `copper_ore` em `ITEMS` ou garanta que o gerador de itens a partir de `BLOCKS` o inclua.

## Adicionar uma textura de bloco

O atlas atual é procedural e usa tiles de 16×16 pixels.

1. Registre cada textura em `BLOCK_TEXTURE_IDS` em `src/domain/blockTextures.ts`. Um bloco pode ter IDs distintos para topo, lado ou frente.
2. Inclua cada novo ID no tipo `Pattern` e em `styles` em `src/engine/blockTextureAtlas.ts`. Defina uma paleta RGB e um padrão; padrões são renderizados por `pixel`.
3. Atualize `textureForBlockFace` para mapear bloco e índice da face ao tile adequado. O atlas também depende de `BLOCK_TEXTURE_COLUMNS`.
4. Verifique a geometria/UVs de chunks e transparência se a nova textura usar alpha, seguindo `tests/world.test.ts`.

Não reutilize um ID já registrado para representar outra face: os índices de textura são calculados pela ordem de `BLOCK_TEXTURE_IDS`.

## Adicionar uma receita

Adicione uma entrada a `RECIPES` em `src/domain/recipes.ts`. `pattern` é uma lista em ordem de linha, da esquerda para a direita e de cima para baixo; slots vazios são `null`. `width` e `height` descrevem o retângulo da receita, não necessariamente o tamanho inteiro da grade.

```ts
{
  id: 'copper_blocks',
  name: 'Blocos de cobre',
  type: 'shaped',
  width: 2,
  height: 2,
  pattern: ['copper_ingot', 'copper_ingot', 'copper_ingot', 'copper_ingot'],
  result: { itemId: 'copper_block', count: 1 }
}
```

Receitas `shaped` preservam a forma; `shapeless` comparam os ingredientes sem posição. Receitas `smelting` são processadas separadamente por `smelt` e não aparecem na grade de crafting. Teste detecção, consumo de ingredientes e falta de espaço de saída em `tests/recipes.test.ts`.

## Verificação local

```sh
npm test
npx tsc --noEmit
npx eslint src/domain/content.ts src/domain/recipes.ts src/domain/blockTextures.ts src/engine/blockTextureAtlas.ts
```
