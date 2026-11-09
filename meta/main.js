
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

let data = await loadData();
let commits = processCommits(data);

// Display the statistics on the Meta page
renderCommitInfo(data, commits);
