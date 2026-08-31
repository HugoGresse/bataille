/**
 * Release step run by CI on every merge to main: bump the patch version and turn the merge commit
 * into the next changelog entry (shown in the app on /changelog).
 *
 * Exits 0 without changing anything when HEAD is already a release commit, so the workflow can run
 * it unconditionally.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const CHANGELOG_PATH = new URL('../src/client/changelog/changelog.json', import.meta.url)

const run = (command) => execSync(command, { encoding: 'utf8' }).trim()

const subject = run('git log -1 --format=%s')
if (/^release:/.test(subject)) {
    console.log('HEAD is a release commit, nothing to do')
    process.exit(0)
}

run('npm version patch --no-git-tag-version')
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

const prMatch = subject.match(/\(#(\d+)\)\s*$/)
const entry = {
    version,
    date: new Date().toISOString().slice(0, 10),
    title: subject.replace(/\s*\(#\d+\)\s*$/, ''),
    pr: prMatch ? Number(prMatch[1]) : null,
}

const entries = JSON.parse(readFileSync(CHANGELOG_PATH, 'utf8'))
entries.unshift(entry)
writeFileSync(CHANGELOG_PATH, JSON.stringify(entries, null, 4) + '\n')

console.log(`v${version}: ${entry.title}${entry.pr ? ` (#${entry.pr})` : ''}`)
