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
	{url: "https://github.com/alkarim-1", title: "GitHub"},
];

const BASE_PATH =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "/"
        : "/Lab1_portfolio_ak/";

for (let p of pages) {
	let url = p.url;
	let title = p.title;
	let a = document.createElement("a");

  a.textContent = title;

  url = !url.startsWith("http") ? BASE_PATH + url : url;
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

document.body.insertAdjacentHTML("afterbegin", `
	<label class="color-scheme">
		Theme:
		<select>
			<option value="light dark">Automatic</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	</label>
`);

let select = document.querySelector("select");
select.addEventListener("input", event => {
	setColorScheme(event.target.value);
});

function setColorScheme (colorScheme) {
	select.value = colorScheme;
	document.documentElement.style.setProperty("color-scheme", colorScheme);

	localStorage.colorScheme = colorScheme;
}

// Step 4.5 (2)
if (localStorage.colorScheme) {
	setColorScheme(localStorage.colorScheme);
}