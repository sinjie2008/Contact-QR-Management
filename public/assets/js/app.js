class ContactDashboard {
  constructor(root) {
    this.root = root;
    this.csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
    this.appUrl = (document.querySelector('meta[name="app-url"]')?.content || location.origin).replace(/\/$/, '');
    this.state = { contacts: [], total: 0, page: 1, perPage: 10, search: '', status: '', stats: null, editing: null, loading: false };
    this.searchTimer = null;
    this.renderShell();
    this.bindEvents();
    this.loadAll();
  }

  renderShell() {
    this.root.innerHTML = `
      <main class="app-shell">
        <header class="topbar">
          <div class="brand"><div class="brand-mark" aria-hidden="true">CQ</div><div><h1>Contact QR Manager</h1><p>Manage contacts and share their live profiles</p></div></div>
          <nav class="top-actions" aria-label="Contact tools">
            <a class="button" href="/contact_qr_import_template.csv" download>Download CSV template</a>
            <a class="button" href="/api/contacts/export">Export CSV</a>
            <button class="button" type="button" data-action="import">Import CSV</button>
            <button class="button primary" type="button" data-action="create">＋ Add contact</button>
          </nav>
        </header>
        <section aria-labelledby="overview-title">
          <div class="overview-heading"><div><h2 id="overview-title">Overview</h2><p>Contact coverage and profile quality at a glance</p></div><span id="stats-updated" class="chart-note"></span></div>
          <div class="chart-grid" id="charts" aria-live="polite"><article class="chart-card"><div class="skeleton" style="width:42%"></div><div class="skeleton" style="width:76%;height:120px;margin-top:24px"></div></article><article class="chart-card"><div class="skeleton" style="width:48%"></div><div class="skeleton" style="width:90%;height:120px;margin-top:24px"></div></article><article class="chart-card"><div class="skeleton" style="width:46%"></div><div class="skeleton" style="width:84%;height:120px;margin-top:24px"></div></article><article class="chart-card"><div class="skeleton" style="width:44%"></div><div class="skeleton" style="width:88%;height:120px;margin-top:24px"></div></article></div>
        </section>
        <section class="panel" aria-labelledby="contacts-title">
          <div class="panel-header"><div><h2 id="contacts-title">Contacts</h2><p id="result-count">Loading contacts…</p></div><button class="button primary" type="button" data-action="create">＋ Add contact</button></div>
          <div class="toolbar"><div class="search-field"><label class="sr-only" for="contact-search">Search contacts</label><input id="contact-search" type="search" placeholder="Search name, company, email…" autocomplete="off"></div><label class="sr-only" for="status-filter">Filter status</label><select id="status-filter"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><label class="sr-only" for="page-size">Rows per page</label><select id="page-size"><option value="10">10 per page</option><option value="25">25 per page</option><option value="50">50 per page</option></select></div>
          <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>
          <div class="table-wrap"><table class="contact-table"><thead><tr><th scope="col">Contact</th><th scope="col">Company</th><th scope="col">Country</th><th scope="col">Status</th><th scope="col">Profile QR</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody id="contact-rows"><tr><td colspan="6" class="empty-chart">Loading contacts…</td></tr></tbody></table></div>
          <footer class="pagination"><span id="page-summary">—</span><div class="pagination-controls"><button class="button small" data-action="previous" type="button">Previous</button><button class="button small" data-action="next" type="button">Next</button></div></footer>
        </section>
      </main>
      <div class="modal-backdrop" id="contact-modal" hidden><section class="modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title"><form id="contact-form"><div class="modal-header"><h2 id="contact-modal-title">Add contact</h2><button class="button icon-button" type="button" data-action="close" aria-label="Close dialog">✕</button></div><div class="modal-body"><div id="form-notice" class="notice" role="alert" hidden></div><div class="form-grid">
        <div class="field"><label for="firstName">First name <span aria-hidden="true">*</span></label><input id="firstName" name="firstName" required maxlength="100" autocomplete="given-name"></div>
        <div class="field"><label for="lastName">Last name <span aria-hidden="true">*</span></label><input id="lastName" name="lastName" required maxlength="100" autocomplete="family-name"></div>
        <div class="field"><label for="phoneNumber">Phone</label><input id="phoneNumber" name="phoneNumber" type="tel" maxlength="50"></div>
        <div class="field"><label for="mobile">Mobile <span aria-hidden="true">*</span></label><input id="mobile" name="mobile" type="tel" required maxlength="50" autocomplete="tel"></div>
        <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" maxlength="190" autocomplete="email"></div>
        <div class="field"><label for="website">Website</label><input id="website" name="website" type="url" maxlength="500" placeholder="https://"></div>
        <div class="field"><label for="company">Company</label><input id="company" name="company" maxlength="190" autocomplete="organization"></div>
        <div class="field"><label for="jobTitle">Job title</label><input id="jobTitle" name="jobTitle" maxlength="190"></div>
        <div class="field"><label for="fax">Fax</label><input id="fax" name="fax" type="tel" maxlength="50"></div>
        <div class="field"><label for="wechatId">WeChat ID</label><input id="wechatId" name="wechatId" maxlength="190"></div>
        <div class="field wide"><label for="whatsappMessage">WhatsApp message</label><input id="whatsappMessage" name="whatsappMessage" maxlength="500"></div>
        <div class="field"><label for="address">Address</label><input id="address" name="address" maxlength="255"></div>
        <div class="field"><label for="city">City</label><input id="city" name="city" maxlength="120"></div>
        <div class="field"><label for="postCode">Post code</label><input id="postCode" name="postCode" maxlength="40"></div>
        <div class="field"><label for="country">Country</label><input id="country" name="country" maxlength="120"></div>
        <div class="field wide"><label for="extraPhones">Additional phone numbers</label><textarea id="extraPhones" name="extraPhones" placeholder="One per line"></textarea></div>
        <div class="field"><label for="extraEmails">Additional emails</label><textarea id="extraEmails" name="extraEmails" placeholder="One per line"></textarea></div>
        <div class="field"><label for="extraWebsites">Additional websites</label><textarea id="extraWebsites" name="extraWebsites" placeholder="One per line"></textarea></div>
        <div class="field wide"><label for="extraAddresses">Additional addresses (JSON)</label><textarea id="extraAddresses" name="extraAddresses" placeholder='[{"address":"…","city":"…","postCode":"…","country":"…"}]'></textarea></div>
        <div class="field"><label for="isActive">Status</label><select id="isActive" name="isActive"><option value="true">Active</option><option value="false">Inactive</option></select></div>
        <div class="form-section"><h3>Profile images</h3><div class="upload-row"><img id="profile-preview" class="upload-preview" alt="Profile image preview"><div class="field"><label for="profileImageFile">Profile image</label><input id="profileImageFile" name="profileImageFile" type="file" accept="image/png,image/jpeg,image/webp"></div></div><div class="upload-row"><img id="background-preview" class="upload-preview cover" alt="Profile background preview"><div class="field"><label for="backgroundImageFile">Background image</label><input id="backgroundImageFile" name="backgroundImageFile" type="file" accept="image/png,image/jpeg,image/webp"></div></div><p class="chart-note">JPG, PNG or WebP, up to 5 MB and 5000 × 5000 pixels. Images upload after the contact is saved.</p></div>
      </div></div><div class="modal-footer"><button class="button" type="button" data-action="close">Cancel</button><button class="button primary" type="submit" id="save-contact">Save contact</button></div></form></section></div>
      <div class="modal-backdrop" id="import-modal" hidden><section class="modal" role="dialog" aria-modal="true" aria-labelledby="import-modal-title"><form id="import-form" enctype="multipart/form-data"><div class="modal-header"><h2 id="import-modal-title">Import contacts</h2><button class="button icon-button" type="button" data-action="close-import" aria-label="Close dialog">✕</button></div><div class="modal-body"><p>Choose a CSV file using the contact template. Existing contacts are matched by their email or phone number where supported.</p><div class="field"><label for="csv-file">CSV file</label><input id="csv-file" type="file" name="file" accept=".csv,text/csv" required></div><div id="import-notice" class="notice" role="status" hidden></div></div><div class="modal-footer"><button class="button" type="button" data-action="close-import">Cancel</button><button class="button primary" type="submit" id="import-submit">Import CSV</button></div></form></section></div>`;
  }

  bindEvents() {
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.querySelector('#contact-search').addEventListener('input', (event) => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => { this.state.search = event.target.value.trim(); this.state.page = 1; this.loadContacts(); }, 250);
    });
    this.root.querySelector('#status-filter').addEventListener('change', (event) => { this.state.status = event.target.value; this.state.page = 1; this.loadContacts(); });
    this.root.querySelector('#page-size').addEventListener('change', (event) => { this.state.perPage = Number(event.target.value); this.state.page = 1; this.loadContacts(); });
    this.root.querySelector('#contact-form').addEventListener('submit', (event) => this.saveContact(event));
    this.root.querySelector('#import-form').addEventListener('submit', (event) => this.importCsv(event));
    this.root.querySelector('#profileImageFile').addEventListener('change', (event) => this.previewFile(event, '#profile-preview'));
    this.root.querySelector('#backgroundImageFile').addEventListener('change', (event) => this.previewFile(event, '#background-preview'));
    this.root.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => { if (event.target === backdrop) this.closeModals(); }));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.closeModals(); });
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    if (this.csrf) headers.set('X-CSRF-TOKEN', this.csrf);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try { const body = await response.json(); message = Object.values(body.errors || {}).join(' ') || body.message || body.error || message; } catch (_) { /* response may be empty */ }
      throw new Error(message);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async loadAll() { await Promise.allSettled([this.loadStats(), this.loadContacts()]); }

  async loadContacts() {
    this.state.loading = true;
    const query = new URLSearchParams({ page: String(this.state.page), perPage: String(this.state.perPage) });
    if (this.state.search) query.set('search', this.state.search);
    if (this.state.status) query.set('status', this.state.status);
    try {
      const payload = await this.request(`/api/contacts?${query}`);
      this.state.contacts = Array.isArray(payload.data) ? payload.data : [];
      this.state.total = Number(payload.total) || 0;
      this.state.page = Number(payload.page) || this.state.page;
      this.state.perPage = Number(payload.perPage) || this.state.perPage;
      this.renderContacts();
    } catch (error) { this.showNotice(error.message, 'error'); this.root.querySelector('#contact-rows').innerHTML = `<tr><td colspan="6" class="empty-chart">${this.escape(error.message)}</td></tr>`; }
    finally { this.state.loading = false; }
  }

  async loadStats() {
    try { const stats = await this.request('/api/stats'); this.state.stats = stats; this.renderCharts(stats); }
    catch (error) { this.root.querySelector('#charts').innerHTML = `<article class="chart-card" style="grid-column:1/-1"><h3>Charts unavailable</h3><p class="chart-note">${this.escape(error.message)}</p></article>`; }
  }

  renderContacts() {
    const rows = this.root.querySelector('#contact-rows');
    const count = this.state.total;
    this.root.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'contact' : 'contacts'} found`;
    const start = count ? (this.state.page - 1) * this.state.perPage + 1 : 0;
    const end = Math.min(this.state.page * this.state.perPage, count);
    this.root.querySelector('#page-summary').textContent = count ? `Showing ${start}–${end} of ${count}` : 'No contacts to show';
    this.root.querySelector('[data-action="previous"]').disabled = this.state.page <= 1;
    this.root.querySelector('[data-action="next"]').disabled = end >= count;
    if (!this.state.contacts.length) { rows.innerHTML = '<tr><td colspan="6" class="empty-chart">No contacts found. Add a contact or adjust your filters.</td></tr>'; return; }
    rows.innerHTML = this.state.contacts.map((contact) => {
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed contact';
      const url = this.profileUrl(contact);
      const qr = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(url)}`;
      const avatar = contact.profileImage ? `<img src="${this.escape(contact.profileImage)}" alt="">` : this.escape(this.initials(contact));
      return `<tr data-id="${this.escape(contact.id)}"><td><div class="contact-name"><span class="contact-avatar">${avatar}</span><span><strong>${this.escape(name)}</strong><small>${this.escape(contact.email || contact.mobile || contact.phoneNumber || '')}</small></span></div></td><td>${this.escape(contact.company || '—')}</td><td>${this.escape(contact.country || '—')}</td><td><span class="status${contact.isActive ? '' : ' inactive'}">${contact.isActive ? 'Active' : 'Inactive'}</span></td><td><div class="qr-cell"><a class="qr-thumb" href="${this.escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open profile QR for ${this.escape(name)}"><img src="${qr}" alt="QR code for ${this.escape(name)}" loading="lazy"></a><div class="qr-actions"><span class="live-label">Live · latest saved profile</span><div class="qr-links"><a href="${this.escape(url)}" target="_blank" rel="noopener noreferrer">Open Profile</a><a href="#" data-action="copy" data-url="${this.escape(url)}">Copy URL</a></div></div></div></td><td><div class="row-actions"><button type="button" class="button small" data-action="edit" data-id="${this.escape(contact.id)}" aria-label="Edit ${this.escape(name)}">Edit</button><button type="button" class="button small danger" data-action="delete" data-id="${this.escape(contact.id)}" aria-label="Delete ${this.escape(name)}">Delete</button></div></td></tr>`;
    }).join('');
  }

  renderCharts(stats) {
    const total = Number(stats.total) || 0;
    const active = Number(stats.active) || 0;
    const inactive = Number(stats.inactive) || 0;
    const percent = total ? Math.round(active / total * 100) : 0;
    const top = (items) => (Array.isArray(items) ? items : []).slice().sort((a, b) => Number(b.count) - Number(a.count)).slice(0, 4);
    const countryItems = top(stats.countries);
    const companyItems = top(stats.companies);
    const imageStats = stats.images || {};
    this.root.querySelector('#charts').innerHTML = `
      <article class="chart-card"><h3>Contact status</h3><p class="chart-note">${total} total contacts</p><div class="metric-chart"><div class="donut" style="--active-pct:${percent}%"><div class="donut-center"><strong>${percent}%</strong><span>active</span></div></div><div class="legend"><div class="legend-row"><i class="legend-dot" style="--dot:#12b76a"></i>Active<strong>${active}</strong></div><div class="legend-row"><i class="legend-dot" style="--dot:#cbd2df"></i>Inactive<strong>${inactive}</strong></div></div></div></article>
      ${this.barChart('Top countries', countryItems, '#315efb')}
      ${this.barChart('Top companies', companyItems, '#7c3aed')}
      <article class="chart-card"><h3>Profile images</h3><p class="chart-note">Image completeness across contacts</p><div class="image-chart">${[['Both', imageStats.both, '#12b76a'], ['One', imageStats.one, '#f79009'], ['None', imageStats.neither, '#98a2b3']].map(([label, value, color]) => { const n = Number(value) || 0; const height = total ? Math.max(n ? 5 : 0, Math.round(n / total * 100)) : 0; return `<div class="image-column"><strong>${n}</strong><div class="image-bar"><span style="--bar-height:${height}%;--bar-color:${color}"></span></div>${label}</div>`; }).join('')}</div></article>`;
    this.root.querySelector('#stats-updated').textContent = `Updated ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
  }

  barChart(title, items, color) {
    if (!items.length) return `<article class="chart-card"><h3>${title}</h3><p class="chart-note">Contact distribution</p><div class="empty-chart">No data yet</div></article>`;
    const max = Math.max(1, ...items.map((item) => Number(item.count) || 0));
    return `<article class="chart-card"><h3>${title}</h3><p class="chart-note">Contact distribution</p><div class="bar-list">${items.map((item) => { const value = Number(item.count) || 0; return `<div class="bar-row"><span class="bar-label" title="${this.escape(item.label)}">${this.escape(item.label || 'Unknown')}</span><div class="bar-track"><div class="bar-fill" style="--bar-width:${Math.round(value / max * 100)}%;--bar-color:${color}"></div></div><strong>${value}</strong></div>`; }).join('')}</div></article>`;
  }

  async handleClick(event) {
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const type = action.dataset.action;
    if (type === 'create') this.openContact();
    if (type === 'edit') this.openContact(this.state.contacts.find((item) => String(item.id) === action.dataset.id));
    if (type === 'delete') await this.deleteContact(action.dataset.id);
    if (type === 'previous' && this.state.page > 1) { this.state.page -= 1; this.loadContacts(); }
    if (type === 'next' && this.state.page * this.state.perPage < this.state.total) { this.state.page += 1; this.loadContacts(); }
    if (type === 'close' || type === 'close-import') this.closeModals();
    if (type === 'import') this.openImport();
    if (type === 'copy') { event.preventDefault(); await this.copyUrl(action.dataset.url); }
  }

  openContact(contact = null) {
    this.state.editing = contact;
    const form = this.root.querySelector('#contact-form');
    form.reset();
    const values = contact || {};
    const fields = ['firstName','lastName','phoneNumber','mobile','email','website','company','jobTitle','fax','wechatId','whatsappMessage','address','city','postCode','country'];
    fields.forEach((key) => { form.elements[key].value = values[key] || ''; });
    form.elements.isActive.value = values.isActive === false ? 'false' : 'true';
    form.elements.extraPhones.value = this.listText(values.extraPhones);
    form.elements.extraEmails.value = this.listText(values.extraEmails);
    form.elements.extraWebsites.value = this.listText(values.extraWebsites);
    form.elements.extraAddresses.value = values.extraAddresses?.length ? JSON.stringify(values.extraAddresses, null, 2) : '';
    this.root.querySelector('#profile-preview').src = values.profileImage || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="100%25" height="100%25" fill="%23f2f4f7"/%3E%3C/svg%3E';
    this.root.querySelector('#background-preview').src = values.profileBackground || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="110" height="64"%3E%3Crect width="100%25" height="100%25" fill="%23f2f4f7"/%3E%3C/svg%3E';
    this.root.querySelector('#contact-modal-title').textContent = contact ? 'Edit contact' : 'Add contact';
    this.root.querySelector('#save-contact').textContent = contact ? 'Save changes' : 'Save contact';
    this.formNotice('');
    this.root.querySelector('#contact-modal').hidden = false;
    this.root.querySelector('#firstName').focus();
  }

  async saveContact(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = this.root.querySelector('#save-contact');
    button.disabled = true;
    this.formNotice('');
    try {
      const data = new FormData(form);
      let extraAddresses = [];
      if (data.get('extraAddresses').trim()) {
        extraAddresses = JSON.parse(data.get('extraAddresses'));
        if (!Array.isArray(extraAddresses)) throw new Error('Additional addresses must be a JSON array.');
      }
      const contact = {};
      ['firstName','lastName','phoneNumber','mobile','email','website','company','jobTitle','fax','wechatId','whatsappMessage','address','city','postCode','country'].forEach((key) => { contact[key] = data.get(key).trim(); });
      contact.isActive = data.get('isActive') === 'true';
      contact.extraPhones = this.parseLines(data.get('extraPhones'));
      contact.extraEmails = this.parseLines(data.get('extraEmails'));
      contact.extraWebsites = this.parseLines(data.get('extraWebsites'));
      contact.extraAddresses = extraAddresses;
      const editing = this.state.editing;
      const result = await this.request(editing ? `/api/contacts/${encodeURIComponent(editing.id)}` : '/api/contacts', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(contact) });
      let saved = result?.data;
      for (const [kind, fieldName] of [['profile', 'profileImageFile'], ['background', 'backgroundImageFile']]) {
        const file = form.elements[fieldName].files[0];
        if (file) {
          if (!saved?.id) throw new Error('Contact saved, but its identifier was missing; image upload could not proceed.');
          const upload = new FormData(); upload.append('kind', kind); upload.append('image', file);
          const response = await this.request(`/api/contacts/${encodeURIComponent(saved.id)}/images`, { method: 'POST', body: upload });
          saved = response?.data || saved;
        }
      }
      this.closeModals();
      this.showNotice(editing ? 'Contact updated.' : 'Contact created.', 'success');
      await Promise.allSettled([this.loadContacts(), this.loadStats()]);
    } catch (error) { this.formNotice(error.message); }
    finally { button.disabled = false; }
  }

  async deleteContact(id) {
    const contact = this.state.contacts.find((item) => String(item.id) === String(id));
    const name = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') : 'this contact';
    if (!window.confirm(`Delete ${name || 'this contact'}? This action cannot be undone.`)) return;
    try { await this.request(`/api/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' }); this.showNotice('Contact deleted.', 'success'); await Promise.allSettled([this.loadContacts(), this.loadStats()]); }
    catch (error) { this.showNotice(error.message, 'error'); }
  }

  openImport() { this.root.querySelector('#import-form').reset(); this.importNotice(''); this.root.querySelector('#import-modal').hidden = false; this.root.querySelector('#csv-file').focus(); }

  async importCsv(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = this.root.querySelector('#import-submit');
    if (!form.elements.file.files[0]) return;
    button.disabled = true; this.importNotice('Importing contacts…', 'success');
    try {
      const body = new FormData(); body.append('file', form.elements.file.files[0]);
      const result = await this.request('/api/contacts/import', { method: 'POST', body });
      const message = result?.message || `CSV import complete${Number.isFinite(result?.imported) ? `: ${result.imported} contacts imported` : '.'}`;
      this.importNotice(message, 'success');
      await Promise.allSettled([this.loadContacts(), this.loadStats()]);
      setTimeout(() => this.closeModals(), 1200);
    } catch (error) { this.importNotice(error.message, 'error'); }
    finally { button.disabled = false; }
  }

  async copyUrl(url) {
    try { await navigator.clipboard.writeText(url); this.showNotice('Profile URL copied.', 'success'); }
    catch (_) { const input = document.createElement('textarea'); input.value = url; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select(); const copied = document.execCommand('copy'); input.remove(); this.showNotice(copied ? 'Profile URL copied.' : 'Unable to copy URL. Open the profile and copy its address.', copied ? 'success' : 'error'); }
  }

  previewFile(event, selector) {
    const file = event.target.files[0];
    if (!file) return;
    const image = this.root.querySelector(selector);
    const oldUrl = image.dataset.objectUrl;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const url = URL.createObjectURL(file); image.src = url; image.dataset.objectUrl = url;
  }

  closeModals() { this.root.querySelectorAll('.modal-backdrop').forEach((modal) => { modal.hidden = true; }); }
  profileUrl(contact) { if (contact.publicUrl) return contact.publicUrl; return `${this.appUrl}/p.html#${encodeURIComponent(contact.id)}`; }
  parseLines(value) { return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
  listText(value) { return Array.isArray(value) ? value.join('\n') : ''; }
  initials(contact) { return `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase() || 'C'; }
  escape(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  showNotice(message, type = 'success') { const notice = this.root.querySelector('#notice'); notice.textContent = message; notice.className = `notice ${type}`; notice.hidden = !message; if (message) setTimeout(() => { if (notice.textContent === message) notice.hidden = true; }, 5000); }
  formNotice(message, type = 'error') { const notice = this.root.querySelector('#form-notice'); notice.textContent = message; notice.className = `notice ${type}`; notice.hidden = !message; }
  importNotice(message, type = 'success') { const notice = this.root.querySelector('#import-notice'); notice.textContent = message; notice.className = `notice ${type}`; notice.hidden = !message; }
}

const appRoot = document.getElementById('contact-app');
if (appRoot) new ContactDashboard(appRoot);
