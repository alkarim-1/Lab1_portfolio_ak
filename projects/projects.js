import { fetchJSON, renderProjects } from '../global.js';

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