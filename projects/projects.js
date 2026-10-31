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

// Lab 5 - Step 5.2: Track selected wedge
let selectedIndex = -1;
function renderPieChart(projectsGiven) {
    
    selectedIndex = -1;

    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );

    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    let arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(50);

    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(data);
    let arcs = arcData.map((d) => arcGenerator(d));

    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    // Clear previous pie chart and legend
    d3.select('#projects-plot').selectAll('path').remove();
    d3.select('.legend').selectAll('li').remove();

    // Draw pie chart
    // Draw pie chart with click selection
let svg = d3.select('#projects-plot');

arcs.forEach((arc, idx) => {
    svg.append('path')
        .attr('d', arc)
        .attr('fill', colors(idx))
        .on('click', () => {
            // Select or deselect the wedge
            selectedIndex = selectedIndex === idx ? -1 : idx;

            // Find the year represented by the selected slice
            selectedYear = selectedIndex === -1
                ? null
                : arcData[idx].data.label;

            // Highlight selected wedge
            svg.selectAll('path')
                .attr('class', (_, i) =>
                    i === selectedIndex ? 'selected' : ''
                );

            // Highlight matching legend item
            d3.select('.legend')
                .selectAll('li')
                .attr('class', (_, i) =>
                    i === selectedIndex
                        ? 'legend-item selected'
                        : 'legend-item'
                );

            // Update project cards using both filters
            updateProjects();
        });
});

    // Draw legend
    let legend = d3.select('.legend');

    data.forEach((d, idx) => {
        legend
            .append('li')
            .attr('class', 'legend-item')
            .attr('style', `--color:${colors(idx)}`)
            .html(`
                <span class="swatch"></span>
                ${d.label} <em>(${d.value})</em>
            `);
    });

} 

renderPieChart(projects);


// Lab 5 - Steps 5.3 and 5.4: Combined Filtering

let query = '';
let selectedYear = null;

function getFilteredProjects() {
    return projects.filter((project) => {
        let values = Object.values(project)
            .join('\n')
            .toLowerCase();

        let matchesSearch = values.includes(query.toLowerCase());

        let matchesYear =
            selectedYear === null ||
            String(project.year) === String(selectedYear);

        return matchesSearch && matchesYear;
    });
}

function updateProjects() {
    let filteredProjects = getFilteredProjects();
    renderProjects(filteredProjects, projectsContainer, 'h2');
}

// Lab 5 - Step 5.4: Combined Search and Year Filtering

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    query = event.target.value;

    // Reset year selection when search changes
    selectedYear = null;
    selectedIndex = -1;

    // Apply the search filter
    updateProjects();

    // Update chart and legend to reflect search results
    renderPieChart(getFilteredProjects());
});