#!/usr/bin/env node
/**
 * Component-level coverage report.
 *
 * Runs `npm run coverage`, then groups coverage/coverage-summary.json by
 * component (src/components/<name>/...) and prints one row per component.
 * Files outside src/components are grouped by their src/ folder, e.g. [middleware].
 *
 * Usage: npm run coverage:component-report -- [options]   (see --help)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cwd = process.cwd();
const coverageDir = path.join(cwd, 'coverage');
const summaryPath = path.join(coverageDir, 'coverage-summary.json');
const cachePath = path.join(coverageDir, 'coverage-by-component.json');

const METRICS = ['lines', 'statements', 'functions', 'branches'];

const printHelp = () => {
    console.log('\ncoverage-report.js - component-level coverage reporter\n');
    console.log('Usage:');
    console.log('  npm run coverage:component-report -- [options]');
    console.log('\nOptions:');
    console.log('  --no-run              Skip test execution and parse existing coverage');
    console.log('  --component <name>    Only run that component\'s tests and report on it (e.g. cart)');
    console.log('  --save, --json        Save compiled report data to coverage/coverage-by-component.json');
    console.log('  --read, --from-json   Read report from coverage/coverage-by-component.json (skips run/parse)');
    console.log('  --sort <type>         Sort by: coverage (default), files, or name');
    console.log('  -h, --help            Show this help message\n');
};

const extractComponent = (absPath) => {
    const parts = path.relative(cwd, absPath).split(path.sep);
    if (parts[0] === 'src' && parts[1] === 'components' && parts[2] && !parts[2].includes('.')) {
        return parts[2];
    }
    if (parts[0] === 'src' && parts[1]) {
        return `[${parts[1]}]`;
    }
    return '[other]';
};

const emptyMetric = () => ({ total: 0, covered: 0, pct: null });
const calculatePct = (covered, total) => (total > 0 ? (covered / total) * 100 : null);

const color = (pct) => {
    if (pct === null) return (s) => s;
    if (pct < 10) return (s) => `\x1b[38;5;196m${s}\x1b[0m`; // red
    if (pct < 30) return (s) => `\x1b[38;5;208m${s}\x1b[0m`; // orange
    if (pct < 70) return (s) => `\x1b[38;5;220m${s}\x1b[0m`; // yellow
    return (s) => `\x1b[38;5;78m${s}\x1b[0m`; // green
};

const bar = (pct, width = 20) => {
    if (pct === null) return ' '.repeat(width);
    const filled = Math.round((pct / 100) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
};

const formatPct = (pct) => (pct === null ? '—' : `${pct.toFixed(1)}%`);

const groupByComponent = (summary) => {
    const components = {};

    for (const [file, fileSummary] of Object.entries(summary)) {
        if (file === 'total') continue;

        const name = extractComponent(path.resolve(cwd, file));
        if (!components[name]) {
            components[name] = { files: 0 };
            METRICS.forEach((m) => { components[name][m] = emptyMetric(); });
        }

        const comp = components[name];
        comp.files++;
        METRICS.forEach((m) => {
            comp[m].total += fileSummary[m].total;
            comp[m].covered += fileSummary[m].covered;
        });
    }

    return components;
};

const computeTotals = (components) => {
    const totals = { files: 0 };
    METRICS.forEach((m) => { totals[m] = emptyMetric(); });

    for (const comp of Object.values(components)) {
        totals.files += comp.files;
        METRICS.forEach((m) => {
            comp[m].pct = calculatePct(comp[m].covered, comp[m].total);
            totals[m].total += comp[m].total;
            totals[m].covered += comp[m].covered;
        });
    }
    METRICS.forEach((m) => { totals[m].pct = calculatePct(totals[m].covered, totals[m].total); });

    return totals;
};

const printReport = (components, totals, sortMode) => {
    const rows = Object.entries(components).map(([name, comp]) => ({ name, ...comp }));

    rows.sort((a, b) => {
        if (sortMode === 'files') return b.files - a.files;
        if (sortMode === 'name') return a.name.localeCompare(b.name);
        if (a.lines.pct === null) return 1;
        if (b.lines.pct === null) return -1;
        return a.lines.pct - b.lines.pct;
    });

    const COL = { name: Math.max(15, ...rows.map((r) => r.name.length)) + 2, files: 8, lines: 9, stmts: 9, fns: 9, branches: 11 };
    const divider = '─'.repeat(COL.name + COL.files + COL.lines + COL.stmts + COL.fns + COL.branches + 24);

    const printRow = (label, row) => {
        const c = color(row.lines.pct);
        console.log(
            label.padEnd(COL.name) +
            String(row.files).padStart(COL.files) +
            c(formatPct(row.lines.pct).padStart(COL.lines)) +
            formatPct(row.statements.pct).padStart(COL.stmts) +
            formatPct(row.functions.pct).padStart(COL.fns) +
            formatPct(row.branches.pct).padStart(COL.branches) +
            '  ' + c(bar(row.lines.pct))
        );
    };

    console.log('\n📊  Coverage by Component\n');
    console.log(
        'Component'.padEnd(COL.name) +
        'Files'.padStart(COL.files) +
        'Lines'.padStart(COL.lines) +
        'Stmts'.padStart(COL.stmts) +
        'Fns'.padStart(COL.fns) +
        'Branches'.padStart(COL.branches) +
        '  Bar (lines)'
    );
    console.log(divider);
    rows.forEach((r) => printRow(r.name, r));
    console.log(divider);
    printRow('TOTAL', totals);

    // Each component counts equally, so one big component can't hide small untested ones.
    const componentLines = rows
        .filter((r) => !r.name.startsWith('['))
        .map((r) => r.lines.pct)
        .filter((pct) => pct !== null);
    if (componentLines.length > 0) {
        const avg = componentLines.reduce((sum, pct) => sum + pct, 0) / componentLines.length;
        console.log(divider);
        console.log(
            `COMPONENT AVG (${componentLines.length})`.padEnd(COL.name) +
            '—'.padStart(COL.files) +
            color(avg)(formatPct(avg).padStart(COL.lines)) +
            '  (equality-weighted: each component counts equally)'
        );
    }
    console.log();
};

const main = () => {
    const argv = process.argv.slice(2);

    if (argv.includes('-h') || argv.includes('--help')) {
        printHelp();
        process.exit(0);
    }

    const argValue = (flag) => {
        const i = argv.indexOf(flag);
        return i !== -1 ? argv[i + 1] : undefined;
    };

    const noRun = argv.includes('--no-run');
    const save = argv.includes('--save') || argv.includes('--json');
    const read = argv.includes('--read') || argv.includes('--from-json');
    const component = argValue('--component');
    const sortArg = (argValue('--sort') || 'coverage').toLowerCase();
    const sortMode = ['coverage', 'files', 'name'].includes(sortArg) ? sortArg : 'coverage';

    if (component && !fs.existsSync(path.join(cwd, 'src', 'components', component))) {
        console.error(`Error: no component named "${component}" in src/components.`);
        process.exit(1);
    }

    if (!noRun && !read) {
        // A single component: run only its tests and only collect coverage from its files.
        const scope = component
            ? ` -- src/components/${component} --collectCoverageFrom='src/components/${component}/**/*.js' --collectCoverageFrom='!**/__tests__/**'`
            : '';
        console.log('Running tests to generate code coverage...\n');
        try {
            execSync(`npm run coverage${scope}`, { stdio: 'inherit', cwd });
        } catch (error) {
            console.log('\nSome tests failed, but proceeding to generate coverage report...\n');
        }
    }

    let components;
    let totals;

    if (read) {
        if (!fs.existsSync(cachePath)) {
            console.error(`Error: Cached coverage data not found at ${cachePath}`);
            console.error('Run again without --read to generate it first.');
            process.exit(1);
        }
        ({ components, totals } = JSON.parse(fs.readFileSync(cachePath, 'utf8')));
    } else {
        if (!fs.existsSync(summaryPath)) {
            console.error('Error: No coverage data found. Run without --no-run first.');
            process.exit(1);
        }
        components = groupByComponent(JSON.parse(fs.readFileSync(summaryPath, 'utf8')));
        if (component) {
            if (!components[component]) {
                console.error(`Error: no coverage data for "${component}". Run without --no-run first.`);
                process.exit(1);
            }
            components = { [component]: components[component] };
        }
        totals = computeTotals(components);

        if (save) {
            fs.writeFileSync(cachePath, JSON.stringify({ components, totals }, null, 2), 'utf8');
            console.log(`Report data cached to ${cachePath}`);
        }
    }

    printReport(components, totals, sortMode);
};

if (require.main === module) {
    main();
}

module.exports = { extractComponent, groupByComponent, computeTotals };
