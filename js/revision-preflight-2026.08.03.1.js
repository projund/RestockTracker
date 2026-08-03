document.addEventListener('click', event => {
  const listButton = event.target.closest('[data-store-mode="list"]');
  if(listButton?.classList.contains('active')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
