
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// ==========================================
// GLOBAL VARIABLES
// ==========================================

// Scales shared between the scatterplot and brushing
let xScale;
let yScale;
let brushBehavior;

// Repository data
let data = [];
let commits = [];
let filteredCommits = [];

// Timeline variables
let commitProgress = 100;
let commitMaxTime;
let timeScale;

// Technology colors for file visualization
const fileColors = d3.scaleOrdinal(d3.schemeTableau10);


// ==========================================
// STEP 1: LOAD AND PROCESS DATA
// ==========================================

// Load and convert CSV data
async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

// Group lines by commit and calculate commit information
function processCommits(data) {
    return d3
        .groups(data, d => d.commit)
        .map(([commit, lines]) => {
            const first = lines[0];
            const { author, date, time, timezone, datetime } = first;

            const ret = {
                id: commit,
                url: 'https://github.com/alkarim-1/Lab1_portfolio_ak/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            // Preserve all lines associated with this commit
            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: false,
                configurable: false,
            });

            return ret;
        })
        // Sort commits chronologically for scrollytelling
        .sort((a, b) => a.datetime - b.datetime);
}


// ==========================================
// STEP 1.3: DISPLAY COMMIT STATISTICS
// ==========================================

function renderCommitInfo(data, commits) {
    const stats = d3.select('#stats');
    stats.selectAll('*').remove();

    const dl = stats.append('dl').attr('class', 'stats');

    // Total lines of code
    dl.append('dt')
        .html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Total files
    const totalFiles = d3.group(data, d => d.file).size;
    dl.append('dt').text('Total files');
    dl.append('dd').text(totalFiles);

    // Average line length
    const avgLineLength = d3.mean(data, d => d.length);
    dl.append('dt').text('Average line length');
    dl.append('dd').text(avgLineLength?.toFixed(1) ?? 'N/A');

    // Longest line
    const longestLine = d3.max(data, d => d.length);
    dl.append('dt').text('Longest line');
    dl.append('dd').text(longestLine ?? 'N/A');

    // Maximum depth
    const maxDepth = d3.max(data, d => d.depth);
    dl.append('dt').text('Maximum depth');
    dl.append('dd').text(maxDepth ?? 'N/A');
}


// ==========================================
// STEP 2: SCATTERPLOT
// ==========================================

// Preserve original colors based on time of day
function getTimeColor(hour) {
    if (hour >= 6 && hour < 12) {
        return '#F4A261'; // Morning
    } else if (hour >= 12 && hour < 18) {
        return '#E76F51'; // Afternoon
    } else if (hour >= 18 && hour < 22) {
        return '#457B9D'; // Evening
    } else {
        return '#264653'; // Night
    }
}

// Calculate circle size based on lines edited
function getRadiusScale(visibleCommits) {
    const maxLines = d3.max(
        visibleCommits,
        d => d.totalLines
    ) || 1;

    return d3.scaleSqrt()
        .domain([0, maxLines])
        .range([2, 30]);
}

// Attach existing tooltip interactions to dots
function attachDotInteractions(selection) {
    selection
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget)
                .style('fill-opacity', 1);

            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', event => {
            updateTooltipPosition(event);
        })
        .on('mouseleave', event => {
            d3.select(event.currentTarget)
                .style('fill-opacity', 0.7);

            updateTooltipVisibility(false);
        });
}

// Initial rendering of scatterplot
function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;

    const margin = {
        top: 10,
        right: 10,
        bottom: 30,
        left: 50
    };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Clear chart only on initial creation
    d3.select('#chart').selectAll('*').remove();

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // X-axis: Commit date
    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    // Y-axis: Time of day
    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Horizontal gridlines
    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(
            d3.axisLeft(yScale)
                .tickFormat('')
                .tickSize(-usableArea.width)
        );

    // Create dots container
    svg.append('g')
        .attr('class', 'dots');

    // X-axis with class for later updates
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(d3.axisBottom(xScale));

    // Y-axis
    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(
            d3.axisLeft(yScale)
                .tickFormat(
                    d => String(d % 24).padStart(2, '0') + ':00'
                )
        );

    // Create interactive brush
    brushBehavior = d3.brush()
        .extent([
            [usableArea.left, usableArea.top],
            [usableArea.right, usableArea.bottom]
        ])
        .on('start brush end', brushed);

    svg.call(brushBehavior);

    // Initial dots and brush overlay ordering
    updateScatterPlot(commits);
}


// ==========================================
// LAB 8 - STEP 1: EVOLUTION VISUALIZATION
// ==========================================

// Update the existing scatterplot without
// creating new SVG elements.
function updateScatterPlot(visibleCommits) {
    const svg = d3.select('#chart svg');
    const dots = svg.select('g.dots');

    // Clear old brush selection
    if (brushBehavior) {
        svg.call(brushBehavior.move, null);
    }

    if (visibleCommits.length === 0) {
        dots.selectAll('circle').remove();
        return;
    }

    // Update date domain
    const [minDate, maxDate] = d3.extent(
        visibleCommits,
        d => d.datetime
    );

    // Handle a single date without collapsing X-axis
    if (minDate.getTime() === maxDate.getTime()) {
        xScale.domain([
            new Date(minDate.getTime() - 3600000),
            new Date(maxDate.getTime() + 3600000)
        ]);
    } else {
        xScale.domain([minDate, maxDate]);
    }

    // Update existing X-axis
    svg.select('.x-axis')
        .call(d3.axisBottom(xScale));

    // Recalculate radii
    const rScale = getRadiusScale(visibleCommits);

    // Draw larger commits first
    const sortedCommits = d3.sort(
        visibleCommits,
        d => -d.totalLines
    );

    // Stable data join keyed by commit ID
    const circles = dots
        .selectAll('circle')
        .data(sortedCommits, d => d.id)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', d => getTimeColor(d.hourFrac))
        .style('fill-opacity', 0.7)
        .classed('selected', false);

    // Keep tooltips active
    attachDotInteractions(circles);

    // Ensure circles receive hover events
    dots.raise();
}


// ==========================================
// LAB 8 - STEP 1.1: TIMELINE SLIDER
// ==========================================

// Apply selected time to all visualizations
function updateTimeline(maxTime) {
    commitMaxTime = maxTime;

    // Filter commits up to selected time
    filteredCommits = commits.filter(
        d => d.datetime <= commitMaxTime
    );

    // Display selected date
    const timeElement = document.getElementById('commit-time');

    if (timeElement) {
        timeElement.textContent =
            commitMaxTime.toLocaleString('en-US', {
                dateStyle: 'long',
                timeStyle: 'short'
            });
    }

    // Update scatterplot
    updateScatterPlot(filteredCommits);

    // Update file visualization
    updateFileDisplay(filteredCommits);

    // Update commit statistics
    const filteredLines = filteredCommits.flatMap(
        d => d.lines
    );

    renderCommitInfo(filteredLines, filteredCommits);

    // Hide old tooltip
    updateTooltipVisibility(false);
}

// Called when slider is moved
function onTimeSliderChange() {
    commitProgress = Number(
        document.getElementById('commit-progress').value
    );

    commitMaxTime = timeScale.invert(commitProgress);

    updateTimeline(commitMaxTime);
}


// ==========================================
// LAB 8 - STEP 2: BIGGEST FILE RACE
// ==========================================

// Show files sorted by the number of lines
function updateFileDisplay(visibleCommits) {
    // Collect recorded lines from filtered commits
    const lines = visibleCommits.flatMap(
        d => d.lines
    );

    // Group by filename
    const files = d3.groups(lines, d => d.file)
        .map(([name, fileLines]) => ({
            name,
            lines: fileLines
        }))
        // Sort biggest files first
        .sort((a, b) => b.lines.length - a.lines.length);

    const container = d3.select('#files');

    // Create a row for each file
    const fileRows = container
        .selectAll('.file-row')
        .data(files, d => d.name)
        .join(
            enter => {
                const row = enter
                    .append('div')
                    .attr('class', 'file-row');

                const dt = row.append('dt');

                dt.append('code');
                dt.append('small');

                row.append('dd');

                return row;
            },
            update => update,
            exit => exit.remove()
        )
        .order();

    // Display filenames
    fileRows
        .select('dt code')
        .text(d => d.name);

    // Display number of lines
    fileRows
        .select('dt small')
        .text(d => `${d.lines.length} lines`);

    // Create one colored dot per line
    fileRows
        .select('dd')
        .selectAll('div.loc')
        .data(d => d.lines)
        .join('div')
        .attr('class', 'loc')
        .style('--color', d => fileColors(d.type))
        .attr('title', d =>
            `${d.type || 'Unknown'} - ${d.file}`
        );
}


// ==========================================
// EXISTING LAB: COMMIT TOOLTIPS
// ==========================================

// Update tooltip information
function renderTooltipContent(commit) {
    if (!commit) return;

    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('tooltip-commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    link.href = commit.url;
    link.textContent = commit.id.substring(0, 7);

    date.textContent = commit.datetime.toLocaleDateString(
        'en-US',
        { dateStyle: 'full' }
    );

    time.textContent = commit.datetime.toLocaleTimeString(
        'en-US',
        { timeStyle: 'short' }
    );

    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

// Show or hide tooltip
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

// Position tooltip near cursor
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');

    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
}


// ==========================================
// EXISTING LAB: BRUSHING
// ==========================================

// Check whether commit is inside selected area
function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }

    const [[x0, y0], [x1, y1]] = selection;

    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return (
        x >= x0 &&
        x <= x1 &&
        y >= y0 &&
        y <= y1
    );
}

// Display number of selected commits
function renderSelectionCount(selection) {
    const selectedCommits = selection
        ? filteredCommits.filter(
            d => isCommitSelected(selection, d)
          )
        : [];

    const countElement = document.querySelector(
        '#selection-count'
    );

    countElement.textContent =
        `${selectedCommits.length || 'No'} commits selected`;

    return selectedCommits;
}

// Display language breakdown for selection
function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
        ? filteredCommits.filter(
            d => isCommitSelected(selection, d)
          )
        : [];

    const container = document.getElementById(
        'language-breakdown'
    );

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }

    const lines = selectedCommits.flatMap(
        d => d.lines
    );

    const breakdown = d3.rollup(
        lines,
        v => v.length,
        d => d.type
    );

    container.innerHTML = '';

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        const dt = document.createElement('dt');
        dt.textContent = language;

        const dd = document.createElement('dd');
        dd.textContent = `${count} lines (${formatted})`;

        container.append(dt, dd);
    }
}

// Handle brush events
function brushed(event) {
    const selection = event.selection;

    d3.selectAll('#chart .dots circle')
        .classed(
            'selected',
            d => isCommitSelected(selection, d)
        );

    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}


// ==========================================
// LAB 8 - STEP 3: SCROLLYTELLING
// ==========================================

// Generate a story section for every commit
function renderCommitStory() {
    d3.select('#scatter-story')
        .selectAll('.step')
        .data(commits, d => d.id)
        .join('div')
        .attr('class', 'step')
        .html((d, i) => {
            const date = d.datetime.toLocaleString(
                'en-US',
                {
                    dateStyle: 'long',
                    timeStyle: 'short'
                }
            );

            const fileCount = d3.group(
                d.lines,
                line => line.file
            ).size;

            const message = i === 0
                ? 'This was the first recorded commit in my portfolio.'
                : 'I continued developing and improving my portfolio website.';

            return `
                <h3>Commit ${i + 1}</h3>

                <p>${message}</p>

                <p>
                    On <strong>${date}</strong>,
                    I edited
                    <strong>${d.totalLines} lines</strong>
                    across
                    <strong>${fileCount} files</strong>.
                </p>

                <p>
                    <a href="${d.url}"
                       target="_blank"
                       rel="noopener noreferrer">
                        View this commit on GitHub
                    </a>
                </p>
            `;
        });
}

// Called when a narrative step enters viewport
function onStepEnter(response) {
    const commit = response.element.__data__;

    if (!commit) return;

    // Convert date to timeline percentage
    commitProgress = timeScale(commit.datetime);

    // Update slider position
    const slider = document.getElementById(
        'commit-progress'
    );

    slider.value = commitProgress;

    // Update all visualizations
    updateTimeline(commit.datetime);
}

// Initialize Scrollama
function initializeScrollytelling() {
    renderCommitStory();

    const scroller = scrollama();

    scroller
        .setup({
            container: '#scrolly-1',
            step: '#scrolly-1 .step',
            offset: 0.5
        })
        .onStepEnter(onStepEnter);

    // Update calculations when window changes size
    window.addEventListener('resize', () => {
        scroller.resize();
    });
}


// ==========================================
// INITIALIZE APPLICATION
// ==========================================

async function init() {
    // Load CSV
    data = await loadData();

    // Process commits
    commits = processCommits(data);

    if (commits.length === 0) {
        console.warn('No commits were found in loc.csv');
        renderCommitInfo([], []);
        return;
    }

    // Initially show all commits
    filteredCommits = commits;

    // Create timeline scale
    timeScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, 100]);

    commitProgress = 100;
    commitMaxTime = timeScale.invert(commitProgress);

    // Create the scatterplot once
    renderScatterPlot(data, commits);

    // Initialize timeline filtering
    const slider = document.getElementById(
        'commit-progress'
    );

    slider.addEventListener('input', onTimeSliderChange);

    // Initialize visualizations
    onTimeSliderChange();

    // Initialize scrollytelling
    initializeScrollytelling();
}

// Start application
init().catch(error => {
    console.error('Failed to initialize Meta page:', error);
});
