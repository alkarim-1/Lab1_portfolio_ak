console.log('IT’S ALIVE!');


function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let nav = document.createElement("nav");
document.body.prepend(nav);

let pages = [
	{url: "", title: "Home"},
	{url: "projects/", title: "Projects"},
	{url: "Resume/", title: "CV"},
	{url: "contact/", title: "Contact"},
	{url: "https://alkarim-1.github.io/Lab1_portfolio_ak/", title: "GitHub"},
];

const ARE_WE_HOME = document.documentElement.classList.contains("home");

for (let p of pages) {
	let url = p.url;
	let title = p.title;
	let a = document.createElement("a");

  a.textContent = title;
	url = ARE_WE_HOME && !url.startsWith("http") ? p.url : "../" + p.url;
	a.href = url;

	if (a.host !== location.host) {
		  a.target = "_blank";
	}
	else {
		// Local link
		if (a.pathname === location.pathname) {
			a.classList.add("current");
		}
	}

	nav.appendChild(a);
}
