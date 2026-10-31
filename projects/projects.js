import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
console.log("Fetched projects:", projects);

const projectsContainer = document.querySelector('.projects');

if (!projectsContainer) {
    console.error("Projects container not found.");
} else {
    console.log("Container found:", projectsContainer);
}

renderProjects(projects, projectsContainer, 'h2');

// Count projects dynamically
const projectsTitle = document.querySelector('.projects-title');

console.log("Projects title:", projectsTitle);
console.log("Number of projects:", projects?.length);

if (projectsTitle && Array.isArray(projects)) {
    projectsTitle.textContent = `My Projects (${projects.length})`;
}


//// Lab 5 - Step 1.4: Static Pie Chart

// Our two data values
let data = [
  { value: 1, label: 'apples' },
  { value: 2, label: 'oranges' },
  { value: 3, label: 'mangos' },
  { value: 4, label: 'pears' },
  { value: 5, label: 'limes' },
  { value: 5, label: 'cherries' },
];


// Create the arc generator
let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

// Generate the pie chart slices
let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);

// Convert each slice into an SVG path
let arcs = arcData.map((d) => arcGenerator(d));

// Assign colors to each slice
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Draw the slices inside our SVG
arcs.forEach((arc, idx) => {
    d3.select('#projects-plot')
        .append('path')
        .attr('d', arc)
        .attr('fill', colors(idx));
});

// Legend
let legend = d3.select('.legend');
data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); // set the inner html of <li>
});
