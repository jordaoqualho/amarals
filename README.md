# Amaral's Pizzaria · novo site (MVP)

Site estático (HTML + CSS + JS puro, sem build). Para rodar:

```bash
python3 -m http.server 8000   # abra http://localhost:8000
```

Para publicar, basta subir a pasta em qualquer hospedagem estática (Netlify, Vercel, Cloudflare Pages ou a própria hospedagem atual).

```
index.html            página única (SEO, schema.org Restaurant, Open Graph)
assets/css/style.css  layout mobile first
assets/js/menu.js     cardápio completo (176 itens, extraídos do site atual)
assets/js/app.js      montador de pizza, carrinho, checkout via WhatsApp, horário ao vivo
assets/img/           fotos e logo do site atual
```

---

## Diagnóstico do site atual (pizzariaamarals.com.br)

| Problema | Impacto |
|---|---|
| O destaque da home depende de **Flash Player** (descontinuado em 2020) e mostra "You need Flash Player 8" | A primeira impressão é de site abandonado |
| **Erros de PHP visíveis** nas páginas Pedidos e Contatos (`Warning: Undefined variable $pat…`) | Passa falta de cuidado e desconfiança |
| Acentos quebrados ("A ?nica de Maring?", "Servi?o") | Aparência pouco profissional |
| Layout fixo para desktop (jQuery 1.4 de 2010), **sem versão mobile** | A maior parte dos pedidos vem do celular |
| Cardápio em tabelas, sem busca, sem fotos e sem botão de pedir | O cliente lê o cardápio e tem que sair do site para pedir |
| 5 canais de pedido espalhados (chat antigo Crafty Syntax, tawk.to, Prato Digital, app iOS, app Android) | Nenhum caminho principal; cliente fica sem saber por onde pedir |
| Formulário de contato com `action="javascript:void(0)"` | Mensagens provavelmente não chegam a ninguém |
| Horário de funcionamento só aparece no Instagram | Cliente não sabe se a pizzaria está aberta |
| Nenhuma prova social (nota 4,5 com 1.382 avaliações não aparece no site) | Perde o argumento mais forte |

## O que as avaliações e o Instagram mostram

**Pontos fortes (usar como argumento de venda):** pizzas enormes e bem servidas, a pizza de meio metro com 16 pedaços (exclusividade em Maringá), ambiente familiar e aconchegante, **espaço kids** (9 menções), **esfihas** (12 menções), frango a passarinho e drinks.

**Pontos de dor:**
- Atendimento frio ou lento no **WhatsApp** ("não dá um boa noite, nem um muito obrigado").
- **Demora no salão** para fazer o pedido, receber e fechar a conta ("priorizam o delivery").
- O Instagram (3.060 seguidores) traz a bio "Não trabalhamos com rodízio!", o que indica que essa dúvida é frequente.

## Como o novo site responde a cada ponto

| Dor | Solução no MVP |
|---|---|
| Ida e volta no WhatsApp | O cliente monta o pedido completo no site (tamanho, meio a meio, borda, observações, endereço, pagamento e troco). A mensagem já chega pronta, educada e organizada, e a equipe só confirma. |
| Demora para pedir no salão | **Modo mesa**: um QR Code em cada mesa aponta para `?mesa=12`, e o pedido chega no WhatsApp com o número da mesa, sem esperar o garçom. |
| Cliente sem saber se está aberto | Selo "Aberto até 00h / Abre amanhã 18h" calculado ao vivo no fuso de Brasília, mais a tabela com o dia de hoje destacado. |
| Dúvida sobre rodízio, taxa e meio a meio | FAQ curto. |
| Ticket médio | Botão direto para a pizza meio metro e sugestão de bebida ou sobremesa no carrinho (upsell). |
| Cliente recorrente | Nome, endereço e forma de pagamento ficam salvos no aparelho para o próximo pedido. |
| Medição | Eventos `view_item`, `add_to_cart`, `begin_checkout` e `purchase_whatsapp` no `dataLayer`, prontos para GA4 e Meta Pixel via GTM. |

As funções do site antigo continuam no novo: cardápio completo com preços, os pedidos online (agora nativos, e os links do app iOS, do Android e do Prato Digital foram mantidos), os telefones, o endereço com mapa e o contato.

## Premissas que precisam ser confirmadas com a pizzaria

Todas ficam em `CONFIG`, no topo de `assets/js/app.js`:

1. **Número do WhatsApp de pedidos.** Usei `(44) 99749-3526`; o site antigo mostra `9749-3526`, sem o 9º dígito.
2. **Meio a meio:** até 2 sabores, cobrando o valor do sabor mais caro (`maxFlavors`, `halfPriceRule`).
3. **Horário:** segunda e de quarta a domingo, das 18h às 00h, fechado na terça (tirado do post no Instagram).
4. **Formas de pagamento:** Pix, cartão na entrega e dinheiro. O site antigo cita apenas o cartão.
5. **Preços:** copiados do site atual em 06/10/2026. Vale revisar se estão atualizados.
6. Os trechos de avaliações vêm de avaliações públicas no Google, com nome abreviado.

## Próximos passos sugeridos (pós-MVP)

- Sessão de fotos dos pratos: as fotos atuais têm 700 px, e as fotos de comida são o que mais aumenta a conversão.
- Painel simples para a pizzaria editar preços e marcar itens esgotados (hoje os preços ficam em `menu.js`).
- Cálculo da taxa de entrega por bairro dentro do checkout.
- QR Codes impressos para as mesas (modo mesa).
- Google Business Profile apontando para o novo site e para o link de pedido.
