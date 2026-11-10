// Applies the saved theme before the page paints (loaded synchronously in <head>).
try { var t = localStorage.getItem('alen.theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) { /* storage blocked: the system theme applies */ }
