/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In postinstall, INIT_CWD is the directory where npm install was run
const projectRoot = process.env.INIT_CWD || process.cwd();

const templates = [
  {
    name: 'SKILL.md',
    path: path.join(__dirname, '../templates/SKILL.md'),
    marker: '<!-- BUILT-IN-AI-SKILLS -->',
  },
  {
    name: 'AGENTS.md',
    path: path.join(__dirname, '../templates/AGENTS.md'),
    marker: '<!-- BUILT-IN-AI-AGENT -->',
  },
];

function upsertMarkedBlock(existingContent, marker, content) {
  const block = `${marker}\n${content}\n${marker}`;
  const firstMarkerIndex = existingContent.indexOf(marker);
  if (firstMarkerIndex === -1) {
    return `${existingContent}\n\n${block}\n`;
  }

  const secondMarkerIndex = existingContent.indexOf(
    marker,
    firstMarkerIndex + marker.length
  );
  if (secondMarkerIndex === -1) {
    return `${existingContent}\n\n${block}\n`;
  }

  return (
    existingContent.slice(0, firstMarkerIndex) +
    block +
    existingContent.slice(secondMarkerIndex + marker.length)
  );
}

/**
 * Synchronizes templates to a target directory.
 * @param {string} targetDir - The directory to sync to.
 * @param {boolean} overwrite - Whether to overwrite existing files.
 */
export function syncTemplates(targetDir, overwrite = false) {
  console.log(
    `Synchronizing Built-in AI templates to ${targetDir} (overwrite: ${overwrite})...`
  );

  for (const template of templates) {
    const targetPath = path.join(targetDir, template.name);
    const templateContent = fs.readFileSync(template.path, 'utf8');
    const contentWithMarkers = `\n\n${template.marker}\n${templateContent}\n${template.marker}\n`;

    if (fs.existsSync(targetPath) && !overwrite) {
      console.log(`${template.name} already exists. Checking for content...`);
      const existingContent = fs.readFileSync(targetPath, 'utf8');
      const nextContent = upsertMarkedBlock(
        existingContent,
        template.marker,
        templateContent
      );

      if (nextContent === existingContent) {
        console.log(`Content already up to date in ${template.name}. Skipping.`);
        continue;
      }

      fs.writeFileSync(targetPath, nextContent);
      console.log(
        existingContent.includes(template.marker)
          ? `Updated marked block in ${template.name}.`
          : `Appended to ${template.name}.`
      );
    } else {
      console.log(
        `${overwrite ? 'Overwriting' : 'Creating'} ${template.name}...`
      );
      // For creation/overwrite, we don't strictly need markers, but let's keep them for consistency
      fs.writeFileSync(
        targetPath,
        overwrite ? templateContent : contentWithMarkers
      );
      console.log(`${overwrite ? 'Overwrote' : 'Created'} ${template.name}.`);
    }
  }

  console.log('Built-in AI templates synchronization complete.');
}

// In postinstall, INIT_CWD is the directory where npm install was run
// If this script is run directly (not imported), execute install logic
if (import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const projectRoot = process.env.INIT_CWD || process.cwd();
  const packageRoot = path.join(__dirname, '..');

  // Only run if not being run inside the package's own root directory
  if (projectRoot !== packageRoot) {
    syncTemplates(projectRoot, false);
  } else {
    console.log('Running inside the package root. Regenerating templates.');
    syncTemplates(packageRoot, true);
  }
}
