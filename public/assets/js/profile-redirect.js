class ProfileRedirect {
  constructor(message) {
    this.message = message;
  }

  open() {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch (_) {
      this.message.textContent = 'Profile unavailable: invalid contact ID.';
      return;
    }
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
      this.message.textContent = 'Profile unavailable: invalid contact ID.';
      return;
    }
    location.replace(`/profile/${encodeURIComponent(id)}`);
  }
}

new ProfileRedirect(document.getElementById('message')).open();
