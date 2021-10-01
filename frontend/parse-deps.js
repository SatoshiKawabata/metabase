#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const glob = require("glob");
const minimatch = require("minimatch");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const readline = require("readline");

const PATTERN = "{enterprise/,}frontend/src/**/*.{js,jsx,ts,tsx}";

// after webpack.config.js
const ALIAS = {
  metabase: "frontend/src/metabase",
  "metabase-lib": "frontend/src/metabase-lib",
  "metabase-enterprise": "enterprise/frontend/src/metabase-enterprise",
  "metabase-types": "frontend/src/metabase-types",
};

function files() {
  return glob.sync(PATTERN);
}

function dependencies() {
  const deps = files().map(fileName => {
    const contents = fs.readFileSync(fileName, "utf-8");
    const options = {
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      decoratorsBeforeExport: true,
      sourceType: "unambiguous",
      plugins: ["jsx", "flow", "decorators-legacy", "exportDefaultFrom"],
    };
    const importList = [];
    try {
      const ast = parser.parse(contents, options);
      traverse(ast, {
        enter(path) {
          if (path.node.type === "ImportDeclaration") {
            importList.push(path.node.source.value);
          }
          if (path.node.type === "CallExpression") {
            const callee = path.node.callee;
            const args = path.node.arguments;
            if (callee.type === "Identifier" && callee.name === "require") {
              if (args.length === 1 && args[0].type === "StringLiteral") {
                importList.push(args[0].value);
              }
            }
          }
        },
      });
    } catch (e) {
      console.error(fileName, e.toString());
      process.exit(-1);
      n;
    }
    const base = path.dirname(fileName) + path.sep;
    const absoluteImportList = importList
      .map(name => {
        const absName = name[0] === "." ? path.normalize(base + name) : name;
        const parts = absName.split(path.sep);
        const realPath = ALIAS[parts[0]];
        parts[0] = realPath ? realPath : parts[0];
        const realName = parts.join(path.sep);
        return realName;
      })
      .map(name => {
        if (fs.existsSync(name)) {
          if (
            fs.lstatSync(name).isDirectory() &&
            fs.existsSync(name + "/index.js")
          ) {
            return name + "/index.js";
          }
          return name;
        } else if (fs.existsSync(name + ".js")) {
          return name + ".js";
        } else if (fs.existsSync(name + ".jsx")) {
          return name + ".jsx";
        }
        return name;
      })
      .filter(name => minimatch(name, PATTERN));

    return { source: fileName, dependencies: absoluteImportList.sort() };
  });
  return deps;
}

function dependents() {
  let dependents = {};
  dependencies().forEach(dep => {
    const { source, dependencies } = dep;
    dependencies.forEach(d => {
      if (!dependents[d]) {
        dependents[d] = [];
      }
      dependents[d].push(source);
    });
  });
  return dependents;
}

function getDependents(sources) {
  const allDependents = dependents();
  let filteredDependents = [];

  sources.forEach(name => {
    const list = allDependents[name];
    if (list && Array.isArray(list) && list.length > 0) {
      filteredDependents.push(...list);
    }
  });

  return Array.from(new Set(filteredDependents)).sort(); // unique
}

function filterDependents() {
  const rl = readline.createInterface({ input: process.stdin });

  const start = async () => {
    let sources = [];
    for await (const line of rl) {
      const name = line.trim();
      if (name.length > 0) {
        sources.push(name);
      }
    }
    const filteredDependents = getDependents(sources);
    console.log(filteredDependents.join("\n"));
  };
  start();
}

function filterAllDependents() {
  const rl = readline.createInterface({ input: process.stdin });

  const start = async () => {
    let sources = [];
    for await (const line of rl) {
      const name = line.trim();
      if (name.length > 0) {
        sources.push(name);
      }
    }
    let filteredDependents = getDependents(sources);

    const allDependents = dependents();
    for (let i = 0; i < filteredDependents.length; ++i) {
      const name = filteredDependents[i];
      const list = allDependents[name];
      if (list && Array.isArray(list) && list.length > 0) {
        const newAddition = list.filter(e => filteredDependents.indexOf(e) < 0);
        filteredDependents.push(...newAddition);
      }
    }
    console.log(filteredDependents.sort().join("\n"));
  };
  start();
}

function countDependents() {
  const allDependents = dependents();
  const sources = Object.keys(allDependents).sort();
  const tally = sources.map(name => {
    return { name, count: allDependents[name].length };
  });
  console.log(tally.map(({ name, count }) => `${count} ${name}`).join("\n"));
}

function countAllDependents() {
  const allDependents = dependents();
  const sources = Object.keys(allDependents).sort();
  const tally = sources.map(name => {
    const list = allDependents[name];
    for (let i = 0; i < list.length; ++i) {
      const deps = allDependents[list[i]];
      if (deps && Array.isArray(deps) && deps.length > 1) {
        const newAddition = deps.filter(e => list.indexOf(e) < 0);
        list.push(...newAddition);
      }
    }
    return { name, count: list.length };
  });
  console.log(tally.map(({ name, count }) => `${count} ${name}`).join("\n"));
}

function matrix() {
  const allDependents = dependents();
  const sources = Object.keys(allDependents).sort();
  const width = Math.max(...sources.map(s => s.length));
  const rows = sources.map(name => {
    const list = allDependents[name];
    const checks = sources.map(dep => (list.indexOf(dep) < 0 ? " " : "x"));
    return name.padEnd(width) + " | " + checks.join("");
  });
  console.log(rows.join("\n"));
}

const USAGE = `
parse-deps cmd

cmd must be one of:

                files   Display list of source files
         dependencies   Show the dependencies of each source file
           dependents   Show the dependents of each source file
  sorted-dependencies   List of all source files sorted by number of dependencies (ascending)
    filter-dependents   Filter direct dependents based on stdin
filter-all-dependents   Filter all indirect and direct dependents based on stdin
     count-dependents   List the total count of direct dependents
 count-all-dependents   List the total count of its direct and indirect dependents
               matrix   Display 2-D matrix of dependent relationship
`;

function main(args) {
  const cmd = args[0];
  if (cmd) {
    switch (cmd.toLowerCase()) {
      case "files":
        console.log(files().join("\n"));
        break;
      case "dependencies":
        console.log(JSON.stringify(dependencies(), null, 2));
        break;
      case "dependents":
        console.log(JSON.stringify(dependents(), null, 2));
        break;
      case "sorted-dependencies":
        const deps = dependencies();
        deps.sort((a, b) => a.dependencies.length - b.dependencies.length);
        console.log(JSON.stringify(deps.map(dep => dep.source), null, 2));
        break;
      case "filter-dependents":
        filterDependents();
        break;
      case "filter-all-dependents":
        filterAllDependents();
        break;
      case "count-dependents":
        countDependents();
        break;
      case "count-all-dependents":
        countAllDependents();
        break;
      case "matrix":
        matrix();
        break;
      default:
        console.log(USAGE);
        break;
    }
  } else {
    console.log(USAGE);
  }
}

let args = process.argv;
args.shift();
args.shift();
main(args);
