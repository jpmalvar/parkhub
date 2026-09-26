// Aplica o tema antes da renderização para evitar "piscar" entre claro e escuro.
(function () {
  try {
    var saved = localStorage.getItem('parkhub-theme')
    var dark = saved ? saved === 'dark' : true
    if (dark) document.documentElement.classList.add('dark')
  } catch (e) {
    document.documentElement.classList.add('dark')
  }
})()
