/* Amaral's Pizzaria — app (vanilla JS, sem build) */
(() => {
  'use strict';

  /* ================= Configuração ================= */
  const CONFIG = {
    // Número que recebe os pedidos (DDI + DDD + número). Confirmar com a pizzaria:
    // o site antigo lista (44) 9749-3526, aqui já com o 9º dígito.
    whatsapp: '5544997493526',
    maxFlavors: 2,
    // 'max' = cobra o sabor mais caro (padrão de mercado) · 'avg' = média dos sabores
    halfPriceRule: 'max',
    // 0 = domingo … 6 = sábado · [abre, fecha] em horas (24 = meia-noite) · null = fechado
    hours: { 0: [18, 24], 1: [18, 24], 2: null, 3: [18, 24], 4: [18, 24], 5: [18, 24], 6: [18, 24] },
    mapEmbed: 'https://maps.google.com/maps?q=Amaral%27s%20Pizzaria%2C%20Av.%20Mandacaru%2C%201199%2C%20Maring%C3%A1%20-%20PR&z=16&output=embed',
  };

  const HIGHLIGHTS = [
    { id: 'c1-calabresa', size: 'GG', tag: 'Meio metro', img: 'pizza-calabresa.jpg', title: 'Calabresa meio metro', desc: '16 pedaços para dividir. Dá para fazer meio a meio.' },
    { id: 'c1-portuguesa', tag: 'Clássica', img: 'pizza-especial.jpg' },
    { id: 'c2-amarals', tag: 'Receita da casa', img: 'pizza-close-2.jpg', title: "Pizza Amaral's" },
    { id: 'c6-frango-a-passarinho-700g', tag: 'Elogiado', emoji: '🍗', title: 'Frango a passarinho', desc: '700g, sequinho e sem massa por fora. Porção generosa.' },
    { id: 'c20-combo-9', tag: 'Combo', emoji: '🥟', title: '20 esfihas + suco 1L' },
  ];

  const REVIEWS = [
    { n: 'Souza R.', t: 'Pizzas enormes! Gostosas, bem assadas, produtos de boa qualidade. Super indico.' },
    { n: 'Elizabeth I.', t: 'Frango a passarinho, uma delícia, sem aquela massinha por fora. Porções generosas.' },
    { n: 'Wellington M.', t: 'Lugar agradável, pizza deliciosa, atendimento incrível e bem localizada. Com certeza voltarei muitas vezes.' },
    { n: 'Karoline B.', t: 'Pizzaria bem aconchegante, com pizzas bem deliciosas e drinks também deliciosos. Vale super a pena.' },
    { n: 'Celso L.', t: 'Ambiente agradável, com ótima estrutura. Pizzas muito bem servidas e saborosas. Vale a pena uma visita.' },
    { n: 'Vinicius R.', t: 'Pizza muito saborosa, tempo de espera médio-rápido e ambiente muito bom.' },
  ];

  const SIZE_INFO = { P: 'pequena', M: 'média', G: 'grande', GG: 'meio metro' };
  const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  /* ================= Utilidades ================= */
  const M = window.MENU;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } },
  };
  // Pronto para GA4 / Meta Pixel via GTM
  const track = (event, data = {}) => { (window.dataLayer = window.dataLayer || []).push({ event, ...data }); };
  const waUrl = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

  const ITEMS = new Map();
  M.categories.forEach((cat) => cat.items.forEach((item) => ITEMS.set(item.id, { item, cat })));
  const PIZZA_CATS = M.categories.filter((c) => c.pizza);
  const sizesOf = (item, cat) => (item.prices ? cat.sizes || M.sizes : null);
  const minPizzaAt = (i) => Math.min(...PIZZA_CATS.flatMap((c) => c.items.map((it) => it.prices[i])));

  let toastTimer;
  function toast(msg) {
    const t = $('[data-toast]');
    // Dialogs abertos ficam na "top layer": o toast precisa estar dentro do último aberto para aparecer
    ($$('dialog[open]').pop() || document.body).appendChild(t);
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ================= Horário ================= */
  function nowSP() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), t: +get('hour') + +get('minute') / 60 };
  }
  const fmtH = (h) => (h === 24 ? '00h' : `${h}h`);

  function openStatus() {
    const { day, t } = nowSP();
    const today = CONFIG.hours[day];
    if (today && t >= today[0] && t < today[1]) return { open: true, text: `Aberto até ${fmtH(today[1])}` };
    if (today && t < today[0]) return { open: false, text: `Abre hoje ${fmtH(today[0])}` };
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      if (CONFIG.hours[d]) return { open: false, text: `Abre ${i === 1 ? 'amanhã' : DAYS[d].toLowerCase()} ${fmtH(CONFIG.hours[d][0])}` };
    }
    return { open: false, text: 'Fechado' };
  }

  function renderStatus() {
    const s = openStatus();
    $$('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-closed', !s.open);
      $('[data-status-text]', el).textContent = s.text;
    });
  }

  function renderHours() {
    const { day } = nowSP();
    const order = [1, 2, 3, 4, 5, 6, 0];
    $('[data-hours]').insertAdjacentHTML('beforeend', `<tbody>${order.map((d) => {
      const h = CONFIG.hours[d];
      return `<tr class="${d === day ? 'is-today' : ''}"><td>${DAYS[d]}${d === day ? ' (hoje)' : ''}</td><td>${h ? `${fmtH(h[0])} às ${fmtH(h[1])}` : '<span class="closed">Fechado</span>'}</td></tr>`;
    }).join('')}</tbody>`);
  }

  /* ================= Cardápio ================= */
  function priceBlock(item, cat) {
    const sizes = sizesOf(item, cat);
    if (!sizes) return item.price != null ? `<div class="mitem__p">${brl(item.price)}</div>` : '';
    return `<div class="sizes">${sizes.map((s, i) => `<span class="${s === 'GG' && cat.pizza ? 'gg' : ''}"><b>${s}</b>${brl(item.prices[i]).replace('R$', '').trim()}</span>`).join('')}</div>`;
  }

  function itemHTML(item, cat) {
    const badge = item.serves ? `<span class="badge badge--green">serve ${esc(item.serves)}</span>` : '';
    const desc = item.desc ? `<p class="mitem__d">${esc(item.desc)}</p>` : item.opts ? `<p class="mitem__d">${esc(item.opts.join(', '))}</p>` : '';
    return `<li data-s="${esc(norm(`${item.name} ${item.desc || ''} ${(item.opts || []).join(' ')} ${cat.title}`))}">
      <button class="mitem" type="button" data-item="${item.id}">
        <div class="mitem__b"><div class="mitem__n">${esc(item.name)}${badge}</div>${desc}${priceBlock(item, cat)}</div>
        <span class="add">${icon('plus')}</span>
      </button></li>`;
  }

  // Uma categoria por vez (página curta no celular); a busca procura em todas
  let activeCat = M.categories[0].key;

  function showCat(key, scroll) {
    activeCat = key;
    const search = $('[data-search]');
    if (search.value) { search.value = ''; filterMenu(''); }
    $$('.mcat').forEach((s) => { s.hidden = s.dataset.cat !== key; });
    const tabs = $('[data-tabs]');
    $$('.tab', tabs).forEach((t) => { const on = t.dataset.tab === key; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
    const active = $('.tab.is-active', tabs);
    tabs.scrollTo({ left: active.offsetLeft - 16, behavior: 'smooth' });
    if (scroll) {
      const top = $('[data-menu]').getBoundingClientRect().top + scrollY - $('.header').offsetHeight - $('.menu__bar').offsetHeight - 8;
      if (scroll === 'force' || scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  function filterMenu(raw) {
    const q = norm(raw.trim());
    let any = false;
    $$('.mcat').forEach((sec) => {
      let n = 0;
      $$('li', sec).forEach((li) => { const ok = !q || li.dataset.s.includes(q); li.hidden = !ok; if (ok) n++; });
      sec.hidden = q ? n === 0 : sec.dataset.cat !== activeCat;
      sec.classList.toggle('is-search', !!q);
      any ||= n > 0;
    });
    $$('.tab').forEach((t) => t.classList.toggle('is-active', !q && t.dataset.tab === activeCat));
    $('[data-empty]').hidden = any;
  }

  function renderMenu() {
    $('[data-tabs]').innerHTML = M.categories.map((c) => `<button type="button" role="tab" class="tab" data-tab="${c.key}">${esc(c.title)}</button>`).join('');
    $('[data-menu]').innerHTML = M.categories.map((c, i) => {
      const note = c.pizza ? `<p class="mcat__note">Até ${CONFIG.maxFlavors} sabores · bordas recheadas a partir de ${brl(Math.min(...M.bordas.map((b) => b.prices[0])))} · GG = meio metro, 16 pedaços</p>` : '';
      const next = M.categories[i + 1];
      return `<section class="mcat" id="cat-${c.key}" data-cat="${c.key}" role="tabpanel"><h3>${esc(c.title)}</h3>${note}<ul class="mlist">${c.items.map((it) => itemHTML(it, c)).join('')}</ul>
        ${next ? `<button type="button" class="mcat__next" data-tab="${next.key}">Ver ${esc(next.title)} →</button>` : ''}</section>`;
    }).join('');
    $('[data-search]').addEventListener('input', (e) => filterMenu(e.target.value));
    showCat(activeCat);
  }

  function renderHighlights() {
    $('[data-highlights]').innerHTML = HIGHLIGHTS.map((h) => {
      const { item, cat } = ITEMS.get(h.id);
      const sizes = sizesOf(item, cat);
      const price = sizes ? item.prices[sizes.indexOf(h.size || sizes[0])] : item.price;
      const media = h.img ? `<img src="assets/img/${h.img}" alt="" loading="lazy" width="700" height="440" />` : `<div class="hcard__ph" aria-hidden="true">${h.emoji}</div>`;
      return `<button class="hcard" type="button" data-item="${h.id}" ${h.size ? `data-size="${h.size}"` : ''}>
        ${media}<span class="hcard__tag">${esc(h.tag)}</span>
        <div class="hcard__b"><h3>${esc(h.title || item.name)}</h3><p>${esc(h.desc || item.desc || '')}</p>
        <div class="hcard__f"><span class="price">${sizes && !h.size ? '<small>a partir de</small>' : ''}${brl(price)}</span><span class="add">${icon('plus')}</span></div></div>
      </button>`;
    }).join('');
  }

  function renderReviews() {
    const colors = ['#1f7a3a', '#c8102e', '#d99d00', '#4a3f39', '#1f6f8b', '#8a3ffc'];
    $('[data-reviews]').innerHTML = REVIEWS.map((r, i) => `<figure class="review-card">
      <span class="stars" aria-label="Avaliação positiva">${icon('star').repeat(5)}</span>
      <blockquote>“${esc(r.t)}”</blockquote>
      <figcaption><span class="av" style="background:${colors[i % colors.length]}">${esc(r.n[0])}</span><span><b>${esc(r.n)}</b><small>Avaliação no Google</small></span></figcaption>
    </figure>`).join('');
  }

  /* ================= Produto / montador de pizza ================= */
  const pDlg = $('[data-product]');
  let P = null;

  function openProduct(id, preset = {}) {
    const ref = id ? ITEMS.get(id) : { item: null, cat: PIZZA_CATS[0] };
    const { item, cat } = ref;
    const sizes = item ? sizesOf(item, cat) : M.sizes;
    P = {
      id, item, cat, sizes,
      pizza: !!cat.pizza,
      size: preset.size || (sizes ? (sizes.includes('G') ? 'G' : sizes[0]) : null),
      flavors: cat.pizza && id ? [id] : [],
      borda: null,
      opt: item && item.opts ? item.opts[0] : null,
      qty: 1, obs: '',
      picker: cat.pizza && !id,
    };
    renderProduct();
    pDlg.showModal();
    $('.sheet__body', pDlg).scrollTop = 0;
    track('view_item', { item_id: id || 'builder' });
  }

  function unitPrice() {
    const i = P.sizes ? P.sizes.indexOf(P.size) : -1;
    if (P.pizza) {
      if (!P.flavors.length) return 0;
      const ps = P.flavors.map((f) => ITEMS.get(f).item.prices[i]);
      let base = CONFIG.halfPriceRule === 'avg' ? ps.reduce((a, b) => a + b, 0) / ps.length : Math.max(...ps);
      if (P.borda) base += M.bordas.find((b) => b.id === P.borda).prices[i];
      return base;
    }
    return P.sizes ? P.item.prices[i] : P.item.price;
  }

  function renderProductHead() {
    const names = P.flavors.map((f) => ITEMS.get(f).item.name);
    if (P.pizza) {
      $('[data-p-cat]', pDlg).textContent = P.size === 'GG' ? 'Pizza meio metro · 16 pedaços' : 'Monte sua pizza';
      $('[data-p-title]', pDlg).textContent = names.length ? names.join(' + ') : 'Escolha os sabores';
      $('[data-p-desc]', pDlg).textContent = names.length === 1 ? ITEMS.get(P.flavors[0]).item.desc || ''
        : names.length > 1 ? 'Meio a meio · vale o preço do sabor mais caro' : `Até ${CONFIG.maxFlavors} sabores na mesma pizza`;
    } else {
      $('[data-p-cat]', pDlg).textContent = P.cat.title;
      $('[data-p-title]', pDlg).textContent = P.item.name;
      $('[data-p-desc]', pDlg).textContent = P.item.desc || (P.item.serves ? `Serve ${P.item.serves}` : '');
    }
  }

  function pickerHTML() {
    const i = M.sizes.indexOf(P.size);
    return `<div class="picker">
      <label class="search">${icon('search')}<input type="search" placeholder="Buscar sabor…" data-pick-search aria-label="Buscar sabor" /></label>
      <div class="picker__list">${PIZZA_CATS.map((c) => `<div data-pick-group><div class="picker__g">${esc(c.title)}</div>${c.items.filter((it) => !P.flavors.includes(it.id)).map((it) => `<button type="button" class="picker__i" data-pick="${it.id}" data-s="${esc(norm(`${it.name} ${it.desc || ''}`))}"><span>${esc(it.name)}</span><span>${brl(it.prices[i])}</span></button>`).join('')}</div>`).join('')}</div>
    </div>`;
  }

  function renderProduct() {
    renderProductHead();
    let html = '';
    if (P.sizes) {
      html += `<div class="grp"><div class="grp__h"><b>Tamanho</b><small class="req">obrigatório</small></div><div class="opts opts--sizes">${P.sizes.map((s, i) => {
        let price;
        if (P.pizza) price = P.flavors.length ? Math.max(...P.flavors.map((f) => ITEMS.get(f).item.prices[i])) : minPizzaAt(i);
        else price = P.item.prices[i];
        return `<label class="opt opt--size"><input type="radio" name="size" value="${s}" ${s === P.size ? 'checked' : ''} /><span class="opt__n">${s}</span><small>${P.pizza ? SIZE_INFO[s] : ''}</small><span class="opt__p">${!P.flavors.length && P.pizza ? '<small>a partir de</small><br>' : ''}${brl(price)}</span></label>`;
      }).join('')}</div></div>`;
    }
    if (P.pizza) {
      const n = P.flavors.length;
      const frac = n > 1 ? `1/${n}` : '';
      html += `<div class="grp"><div class="grp__h"><b>Sabores</b><small class="${n ? '' : 'req'}">${n}/${CONFIG.maxFlavors}</small></div><div class="flavors">
        ${P.flavors.map((f) => { const it = ITEMS.get(f).item; return `<div class="flavor"><span class="flavor__frac">${frac || '1'}</span><span class="flavor__n">${esc(it.name)}</span><span class="flavor__p">${brl(it.prices[M.sizes.indexOf(P.size)])}</span><button type="button" class="icon-btn" data-unpick="${f}" aria-label="Remover ${esc(it.name)}">${icon('x')}</button></div>`; }).join('')}
        ${n < CONFIG.maxFlavors && !P.picker ? `<button type="button" class="add-flavor" data-open-picker>${icon('plus')}${n ? 'Adicionar 2º sabor (meio a meio)' : 'Escolher sabor'}</button>` : ''}
      </div>${P.picker && n < CONFIG.maxFlavors ? pickerHTML() : ''}</div>`;
      const i = M.sizes.indexOf(P.size);
      html += `<div class="grp"><div class="grp__h"><b>Borda recheada</b><small>opcional</small></div><div class="opts">
        <label class="opt"><input type="radio" name="borda" value="" ${!P.borda ? 'checked' : ''} /><span class="radio"></span><span class="opt__n">Sem borda</span></label>
        ${M.bordas.map((b) => `<label class="opt"><input type="radio" name="borda" value="${b.id}" ${P.borda === b.id ? 'checked' : ''} /><span class="radio"></span><span class="opt__n">${esc(b.name)}</span><span class="opt__p">+ ${brl(b.prices[i])}</span></label>`).join('')}
      </div></div>`;
    }
    if (P.item && P.item.opts && P.item.opts.length > 1) {
      html += `<div class="grp"><div class="grp__h"><b>Escolha uma opção</b><small class="req">obrigatório</small></div><div class="opts">${P.item.opts.map((o) => `<label class="opt"><input type="radio" name="opt" value="${esc(o)}" ${o === P.opt ? 'checked' : ''} /><span class="radio"></span><span class="opt__n">${esc(o)}</span></label>`).join('')}</div></div>`;
    }
    html += `<label class="field"><span>Alguma observação? <i>(opcional)</i></span><textarea rows="2" data-p-obs placeholder="${P.pizza ? 'Ex.: sem cebola, bem assada' : 'Ex.: bem gelada'}">${esc(P.obs)}</textarea></label>`;
    $('[data-p-body]', pDlg).innerHTML = html;
    updateProductFoot();
  }

  function updateProductFoot() {
    const ready = !P.pizza || P.flavors.length > 0;
    const btn = $('[data-p-add]', pDlg);
    btn.disabled = !ready;
    btn.innerHTML = ready ? `<span>Adicionar</span><b>${brl(unitPrice() * P.qty)}</b>` : '<span>Escolha um sabor</span>';
    $('[data-q-val]', pDlg).textContent = P.qty;
    $('[data-q="-1"]', pDlg).disabled = P.qty <= 1;
  }

  pDlg.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'size') { P.size = t.value; renderProduct(); }
    else if (t.name === 'borda') { P.borda = t.value || null; updateProductFoot(); }
    else if (t.name === 'opt') { P.opt = t.value; }
  });
  pDlg.addEventListener('input', (e) => {
    if (e.target.matches('[data-p-obs]')) P.obs = e.target.value;
    if (e.target.matches('[data-pick-search]')) {
      const q = norm(e.target.value.trim());
      $$('[data-pick-group]', pDlg).forEach((g) => {
        let n = 0;
        $$('[data-pick]', g).forEach((b) => { b.hidden = !!q && !b.dataset.s.includes(q); if (!b.hidden) n++; });
        g.hidden = n === 0;
      });
    }
  });
  pDlg.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-open-picker]')) { P.picker = true; renderProduct(); $('[data-pick-search]', pDlg)?.focus(); }
    else if (t.dataset.pick) { P.flavors.push(t.dataset.pick); P.picker = false; renderProduct(); }
    else if (t.dataset.unpick) { P.flavors = P.flavors.filter((f) => f !== t.dataset.unpick); if (!P.flavors.length) P.picker = true; renderProduct(); }
    else if (t.dataset.q) { P.qty = Math.max(1, P.qty + +t.dataset.q); updateProductFoot(); }
    else if (t.matches('[data-p-add]')) addCurrentToCart();
  });
  // Fecha ao tocar fora; Enter num campo não envia o form (que fecharia o modal)
  pDlg.addEventListener('click', (e) => { if (e.target === pDlg) pDlg.close(); });
  pDlg.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault(); });

  /* ================= Carrinho ================= */
  let cart = store.get('amarals.cart', []);
  const cartTotal = () => cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const cartCount = () => cart.reduce((s, l) => s + l.qty, 0);

  function lineFromProduct() {
    const details = [];
    let title;
    if (P.pizza) {
      const names = P.flavors.map((f) => ITEMS.get(f).item.name);
      const size = P.size === 'GG' ? 'GG (meio metro)' : P.size;
      if (names.length > 1) { title = `Pizza ${size} meio a meio`; names.forEach((n) => details.push(`½ ${n}`)); }
      else title = `Pizza ${size} · ${names[0]}`;
      if (P.borda) details.push(`Borda ${M.bordas.find((b) => b.id === P.borda).name}`);
    } else {
      title = P.item.name;
      if (P.cat.key === 'esfihas') title = `Esfiha ${P.item.name}`;
      if (P.cat.key === 'calzones') title = `Calzone ${P.item.name}`;
      if (P.sizes) title += ` (${P.size})`;
      if (P.opt && P.item.opts.length > 1) details.push(P.opt);
      else if (P.opt) title += ` ${P.opt}`;
    }
    const obs = P.obs.trim();
    const key = JSON.stringify([P.id, P.size, [...P.flavors].sort(), P.borda, P.opt, obs]);
    const cat = P.pizza ? (P.flavors.some((f) => ITEMS.get(f).cat.key === 'doces') ? 'doces' : 'pizza') : P.cat.key;
    return { key, title, details, obs, unit: unitPrice(), qty: P.qty, cat };
  }

  function addLine(line) {
    const same = cart.find((l) => l.key === line.key);
    if (same) same.qty += line.qty; else cart.push(line);
    saveCart();
    const b = $('.btn-cart'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    toast(`${line.qty}× ${line.title} adicionado`);
    track('add_to_cart', { item: line.title, value: line.unit * line.qty });
  }

  function addCurrentToCart() {
    if (P.pizza && !P.flavors.length) return;
    const line = lineFromProduct();
    pDlg.close();
    addLine(line);
  }

  function saveCart() { store.set('amarals.cart', cart); renderCart(); }

  function renderCart() {
    const count = cartCount();
    const total = brl(cartTotal());
    $$('[data-cart-count]').forEach((el) => { el.textContent = count; el.hidden = !count; });
    $$('[data-cart-total]').forEach((el) => { el.textContent = total; });
    $('[data-dock]').classList.toggle('has-items', count > 0);
    $('[data-dock-menu]').hidden = count > 0;
    $('[data-dock-cart]').hidden = count === 0;

    $('[data-lines]').innerHTML = cart.map((l, i) => `<li class="line">
      <div class="line__b"><div class="line__t">${esc(l.title)}</div>${l.details.length || l.obs ? `<div class="line__d">${[...l.details, l.obs && `Obs.: ${l.obs}`].filter(Boolean).map(esc).join('<br>')}</div>` : ''}</div>
      <div class="line__r"><span class="line__p">${brl(l.unit * l.qty)}</span>
        <div class="qty qty--sm"><button type="button" data-line="${i}" data-d="-1" aria-label="${l.qty === 1 ? 'Remover' : 'Diminuir'}">${icon(l.qty === 1 ? 'trash' : 'minus')}</button><output>${l.qty}</output><button type="button" data-line="${i}" data-d="1" aria-label="Aumentar">${icon('plus')}</button></div>
      </div></li>`).join('');
    $('[data-cart-empty]').hidden = count > 0;
    $('[data-items-foot]').hidden = count === 0;
    renderUpsell();
  }

  function renderUpsell() {
    const box = $('[data-upsell]');
    if (!cart.length) { box.hidden = true; return; }
    const hasDrink = cart.some((l) => l.cat === 'bebidas');
    const hasSweet = cart.some((l) => l.cat === 'doces' || /\(doce\)/.test(l.title));
    let title; let ids;
    if (!hasDrink) { title = 'Vai uma bebida gelada?'; ids = ['c9-refrigerante-2l', 'c14-jarra-1litro', 'c11-garrafa-premium-600ml']; }
    else if (!hasSweet) { title = 'Que tal uma sobremesa?'; ids = ['c19-nutella-com-morango', 'c19-prestigio', 'c19-brigadeiro']; }
    else { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<b>${title}</b><div class="upsell__list">${ids.filter((id) => ITEMS.has(id)).map((id) => { const { item } = ITEMS.get(id); return `<button type="button" class="upsell__i" data-item="${id}"><span>${esc(item.name.replace(' (doce)', ''))}${ITEMS.get(id).cat.key === 'esfihas' ? ' · esfiha' : ''}</span><em>${brl(item.price)}</em><span class="add">${icon('plus')}</span></button>`; }).join('')}</div>`;
  }

  /* ================= Drawer / checkout ================= */
  const cDlg = $('[data-cart]');
  const form = $('[data-checkout]');
  const params = new URLSearchParams(location.search);
  const tableParam = params.get('mesa');
  let lastWa = '';

  function showView(v) {
    $$('[data-view]', cDlg).forEach((el) => { el.hidden = el.dataset.view !== v; });
    $('[data-cart-back]').hidden = v !== 'checkout';
    $('[data-cart-title]').textContent = { items: 'Seu pedido', checkout: 'Finalizar pedido', done: 'Tudo certo!' }[v];
  }

  function openCart() {
    showView('items');
    renderCart();
    if (!cDlg.open) cDlg.showModal();
  }

  function goCheckout() {
    if (!cart.length) return;
    const c = store.get('amarals.customer', {});
    ['nome', 'rua', 'bairro', 'compl', 'ref'].forEach((k) => { if (c[k] && !form.elements[k].value) form.elements[k].value = c[k]; });
    if (c.pag) { const r = form.querySelector(`[name="pag"][value="${c.pag}"]`); if (r) r.checked = true; }
    if (tableParam) { form.querySelector('[data-mode-mesa]').hidden = false; form.elements.mode.value = 'mesa'; form.elements.mesa.value = tableParam; }
    else if (c.mode && c.mode !== 'mesa') form.elements.mode.value = c.mode;
    syncForm();
    showView('checkout');
    track('begin_checkout', { value: cartTotal() });
  }

  function syncForm() {
    const mode = form.elements.mode.value;
    $('[data-addr]', form).hidden = mode !== 'entrega';
    $('[data-table]', form).hidden = mode !== 'mesa';
    $('[data-fee-note]', form).hidden = mode !== 'entrega';
    $('[data-pay]', form).hidden = mode === 'mesa';
    $('[data-troco]', form).hidden = mode === 'mesa' || form.elements.pag.value !== 'Dinheiro';
    $('[data-review]', form).innerHTML = `<b>${cartCount()} ${cartCount() > 1 ? 'itens' : 'item'}</b> no pedido<ul>${cart.map((l) => `<li>${l.qty}× ${esc(l.title)}</li>`).join('')}</ul>`;
  }

  function buildMessage(d) {
    const out = ["Olá, Amaral's! 🍕 Quero fazer um pedido pelo site:", ''];
    cart.forEach((l) => {
      out.push(`*${l.qty}x ${l.title}* · ${brl(l.unit * l.qty)}`);
      l.details.forEach((x) => out.push(`   ${x}`));
      if (l.obs) out.push(`   Obs.: ${l.obs}`);
    });
    out.push('', `*Total dos itens: ${brl(cartTotal())}*`);
    if (d.mode === 'entrega') out.push('_(+ taxa de entrega)_');
    out.push('');
    if (d.mode === 'entrega') {
      out.push('🛵 *Entrega*', `Nome: ${d.nome}`, `Endereço: ${d.rua}${d.compl ? `, ${d.compl}` : ''} · ${d.bairro}`);
      if (d.ref) out.push(`Referência: ${d.ref}`);
    } else if (d.mode === 'retirada') {
      out.push('🏃 *Retirada no balcão*', `Nome: ${d.nome}`);
    } else {
      out.push(`🍽️ *Pedido na mesa ${d.mesa}*`, `Nome: ${d.nome}`);
    }
    if (d.mode !== 'mesa') {
      const troco = d.pag === 'Dinheiro' && d.troco ? ` (troco para ${brl(parseFloat(d.troco.replace(',', '.')) || 0)})` : '';
      out.push(`Pagamento: ${d.pag}${troco}`);
    }
    if (d.obs) out.push(`Obs.: ${d.obs}`);
    out.push('', 'Obrigado! 😊');
    return out.join('\n');
  }

  form.addEventListener('change', syncForm);
  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-invalid'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    Object.keys(d).forEach((k) => { d[k] = String(d[k]).trim(); });
    const required = ['nome', ...(d.mode === 'entrega' ? ['rua', 'bairro'] : []), ...(d.mode === 'mesa' ? ['mesa'] : [])];
    const missing = required.filter((k) => !d[k]);
    $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
    if (missing.length) {
      missing.forEach((k) => form.elements[k].closest('.field').classList.add('is-invalid'));
      form.elements[missing[0]].focus();
      toast('Preencha os campos destacados');
      return;
    }
    store.set('amarals.customer', { nome: d.nome, rua: d.rua, bairro: d.bairro, compl: d.compl, ref: d.ref, pag: d.pag, mode: d.mode });
    lastWa = waUrl(buildMessage(d));
    track('purchase_whatsapp', { value: cartTotal(), mode: d.mode });
    const win = window.open(lastWa, '_blank', 'noopener');
    if (!win) location.href = lastWa;
    $('[data-wa-again]').href = lastWa;
    showView('done');
  });

  cDlg.addEventListener('click', (e) => {
    if (e.target === cDlg) return cDlg.close();
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.line != null) {
      const l = cart[+t.dataset.line];
      l.qty += +t.dataset.d;
      if (l.qty <= 0) cart.splice(+t.dataset.line, 1);
      saveCart();
    } else if (t.matches('[data-close-cart]')) cDlg.close();
    else if (t.matches('[data-cart-back]')) showView('items');
    else if (t.matches('[data-go-checkout]')) goCheckout();
    else if (t.matches('[data-new-order]')) { cart = []; saveCart(); cDlg.close(); location.hash = '#cardapio'; }
  });

  /* ================= Ligações globais ================= */
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab], a[href^="#cat-"]');
    if (tab) {
      e.preventDefault();
      showCat(tab.dataset.tab || tab.getAttribute('href').slice(5), tab.matches('a') ? 'force' : true);
      return;
    }
    const t = e.target.closest('[data-item], [data-open-cart], [data-quick-gg], [data-wa-link], [data-wa-reserve], [data-map-load]');
    if (!t) return;
    if (t.dataset.item && !t.closest('[data-product]')) {
      const { item, cat } = ITEMS.get(t.dataset.item);
      // Itens simples (sem tamanho/opção) vindos do upsell entram direto no carrinho
      if (t.closest('[data-upsell]') && !sizesOf(item, cat) && !(item.opts && item.opts.length > 1)) {
        addLine({ key: JSON.stringify([item.id]), title: cat.key === 'esfihas' ? `Esfiha ${item.name}` : item.name, details: [], obs: '', unit: item.price, qty: 1, cat: cat.key });
        return;
      }
      openProduct(t.dataset.item, { size: t.dataset.size });
    } else if (t.matches('[data-open-cart]')) openCart();
    else if (t.matches('[data-quick-gg]')) { if (cDlg.open) cDlg.close(); openProduct(null, { size: 'GG' }); }
    else if (t.matches('[data-wa-link]')) { e.preventDefault(); window.open(waUrl("Olá, Amaral's! Vim pelo site e gostaria de tirar uma dúvida."), '_blank', 'noopener'); track('contact_whatsapp'); }
    else if (t.matches('[data-wa-reserve]')) { e.preventDefault(); window.open(waUrl("Olá, Amaral's! Gostaria de reservar uma mesa.\nData: \nHorário: \nNúmero de pessoas: "), '_blank', 'noopener'); track('reserve_whatsapp'); }
    else if (t.matches('[data-map-load]')) loadMap();
  });

  function loadMap() {
    const box = $('[data-map]');
    if (box.querySelector('iframe')) return;
    box.insertAdjacentHTML('beforeend', `<iframe src="${CONFIG.mapEmbed}" title="Mapa: Amaral's Pizzaria" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`);
  }
  new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) { loadMap(); obs.disconnect(); }
  }, { rootMargin: '200px' }).observe($('[data-map]'));

  /* ================= Init ================= */
  renderStatus();
  setInterval(renderStatus, 60_000);
  renderHours();
  renderHighlights();
  renderMenu();
  renderReviews();
  renderCart();
  $('[data-year]').textContent = new Date().getFullYear();
  if (tableParam) toast(`Mesa ${tableParam}: peça por aqui sem esperar o garçom`);
})();
