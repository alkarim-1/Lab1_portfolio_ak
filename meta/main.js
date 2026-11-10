
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Step 5.4: Scales shared with brushing functions
let xScale;
let yScale;

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
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
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

            // Keep the original lines but hide them from console output
            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: false,
                configurable: false,
            });

            return ret;
        });
}

// Step 1.3: Display codebase statistics
function renderCommitInfo(data, commits) {
    // Clear any previously rendered stats
    const stats = d3.select('#stats');
    stats.selectAll('*').remove();

    // Create the stats list
    const dl = stats.append('dl').attr('class', 'stats');

    // Total lines of code
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // 1. Number of files
    const totalFiles = d3.group(data, d => d.file).size;
    dl.append('dt').text('Total files');
    dl.append('dd').text(totalFiles);

    // 2. Average line length
    const avgLineLength = d3.mean(data, d => d.length);
    dl.append('dt').text('Average line length');
    dl.append('dd').text(avgLineLength?.toFixed(1) ?? 'N/A');

    // 3. Longest line length
    const longestLine = d3.max(data, d => d.length);
    dl.append('dt').text('Longest line');
    dl.append('dd').text(longestLine ?? 'N/A');

    // 4. Maximum depth
    const maxDepth = d3.max(data, d => d.depth);
    dl.append('dt').text('Maximum depth');
    dl.append('dd').text(maxDepth ?? 'N/A');
}


// Step 2: Scatterplot of commits by date and time
function renderScatterPlot(data, commits) {
    // Step 2.1: Chart dimensions
    const width = 1000;
    const height = 600;

    // Step 2.2: Margins for axes
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Remove an existing plot before creating a new one
    d3.select('#chart').selectAll('*').remove();

    // Create SVG
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Create X and Y scales
    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);
    
    // Step 4.1–4.2: Scale dot sizes based on lines edited
    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);

    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    // Step 2.3: Add horizontal gridlines
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    // Draw commit dots
    
    // Step 2.3: Color commits by time of day
    const getTimeColor = (hour) => {
        if (hour >= 6 && hour < 12) {
            return '#F4A261'; // Morning - light orange
        } else if (hour >= 12 && hour < 18) {
            return '#E76F51'; // Afternoon - darker orange
        } else if (hour >= 18 && hour < 22) {
            return '#457B9D'; // Evening - blue
        } else {
            return '#264653'; // Night - dark blue
        }
    };

    // Draw commit dots
    const dots = svg.append('g').attr('class', 'dots');

    // Step 4.3: Sort largest commits first
    const sortedCommits = d3.sort(commits, d => -d.totalLines);

    // Draw commit dots
    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', d => getTimeColor(d.hourFrac))
        .style('fill-opacity', 0.7)
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

    // Create axes
    const xAxis = d3.axisBottom(xScale);

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    
    // Step 5.1–5.4: Create interactive brush
    const brush = d3
        .brush()
        .extent([
            [usableArea.left, usableArea.top],
            [usableArea.right, usableArea.bottom]
        ])
        .on('start brush end', brushed);

    svg.call(brush);

    // Step 5.2: Keep dots interactive above brush overlay
    svg.selectAll('.dots, .overlay ~ *').raise();

}


// Load and process data
let data = await loadData();
let commits = processCommits(data);

// Step 1.3: Display statistics
renderCommitInfo(data, commits);


// Step 3.1: Update tooltip content
function renderTooltipContent(commit) {
    if (!commit || Object.keys(commit).length === 0) return;

    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    link.href = commit.url;
    link.textContent = commit.id.substring(0, 7);

    date.textContent = commit.datetime.toLocaleDateString('en', {
        dateStyle: 'full',
    });

    time.textContent = commit.datetime.toLocaleTimeString('en', {
        timeStyle: 'short',
    });

    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

// Step 3.3: Show or hide the tooltip
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

// Step 3.4: Position tooltip near cursor
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');

    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
}


// Step 5.4: Check whether a commit is inside the brush selection
function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }

    const [[x0, y0], [x1, y1]] = selection;

    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

// Step 5.5: Display number of selected commits
function renderSelectionCount(selection) {
    const selectedCommits = selection
        ? commits.filter(d => isCommitSelected(selection, d))
        : [];

    const countElement = document.querySelector('#selection-count');

    countElement.textContent =
        `${selectedCommits.length || 'No'} commits selected`;

    return selectedCommits;
}

// Step 5.6: Display language breakdown
function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
        ? commits.filter(d => isCommitSelected(selection, d))
        : [];

    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }

    const lines = selectedCommits.flatMap(d => d.lines);

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

// Step 5.4: Handle brush selections
function brushed(event) {
    const selection = event.selection;

    d3.selectAll('#chart .dots circle')
        .classed('selected', d => isCommitSelected(selection, d));

    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

// Step 2: Display scatterplot
renderScatterPlot(data, commits);
