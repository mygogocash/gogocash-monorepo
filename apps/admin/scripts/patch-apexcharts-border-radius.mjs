/**
 * ApexCharts 4.x exposes `borderRadiusWhenStacked: 'all'` in types/defaults but does not
 * honor it in createBorderRadiusArr — middle stack segments stay square.
 * This postinstall patch wires the option for dist bundles and src Helpers.
 * Idempotent: safe to run multiple times.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.join(__dirname, "..");
const repoRoot = path.resolve(adminRoot, "..", "..");
const apex = [
  path.join(adminRoot, "node_modules", "apexcharts"),
  path.join(repoRoot, "node_modules", "apexcharts"),
].find((candidate) => fs.existsSync(candidate));

if (!apex) {
  console.warn("[patch-apexcharts] apexcharts not installed, skip");
  process.exit(0);
}

const MARKER = 'var B="all"===i.config.plotOptions.bar.borderRadiusWhenStacked';

const MIN_OLD =
  'if(a)return o;for(var l=0;l<n;l++){for(var h=[],c=[],d=0,u=0;u<s;u++){var g=t[u][l];g>0?(h.push(u),d++):g<0&&(c.push(u),d++)}if(h.length>0&&0===c.length)if(1===h.length)o[h[0]][l]="both";else{var p,f=h[0],x=h[h.length-1],b=r(h);try{for(b.s();!(p=b.n()).done;){var m=p.value;o[m][l]=m===f?"bottom":m===x?"top":"none"}}catch(t){b.e(t)}finally{b.f()}}else if(c.length>0&&0===h.length)if(1===c.length)o[c[0]][l]="both";else{var v,y=Math.max.apply(Math,c),w=Math.min.apply(Math,c),k=r(c);try{for(k.s();!(v=k.n()).done;){var A=v.value;o[A][l]=A===y?"bottom":A===w?"top":"none"}}catch(t){k.e(t)}finally{k.f()}}else if(h.length>0&&c.length>0){var C,S=h[h.length-1],L=r(h);try{for(L.s();!(C=L.n()).done;){var M=C.value;o[M][l]=M===S?"top":"none"}}catch(t){L.e(t)}finally{L.f()}var P,I=Math.max.apply(Math,c),T=r(c);try{for(T.s();!(P=T.n()).done;){var z=P.value;o[z][l]=z===I?"bottom":"none"}}catch(t){T.e(t)}finally{T.f()}}else if(1===d){o[h[0]||c[0]][l]="both"}}return o}';

const MIN_NEW =
  'if(a)return o;var B="all"===i.config.plotOptions.bar.borderRadiusWhenStacked;for(var l=0;l<n;l++){for(var h=[],c=[],d=0,u=0;u<s;u++){var g=t[u][l];g>0?(h.push(u),d++):g<0&&(c.push(u),d++)}if(h.length>0&&0===c.length)if(1===h.length)o[h[0]][l]="both";else{var p,f=h[0],x=h[h.length-1],b=r(h);try{for(b.s();!(p=b.n()).done;){var m=p.value;o[m][l]=m===f?"bottom":m===x?"top":B?"both":"none"}}catch(t){b.e(t)}finally{b.f()}}else if(c.length>0&&0===h.length)if(1===c.length)o[c[0]][l]="both";else{var v,y=Math.max.apply(Math,c),w=Math.min.apply(Math,c),k=r(c);try{for(k.s();!(v=k.n()).done;){var A=v.value;o[A][l]=A===y?"bottom":A===w?"top":B?"both":"none"}}catch(t){k.e(t)}finally{k.f()}}else if(h.length>0&&c.length>0){var C,S=h[h.length-1],L=r(h);try{for(L.s();!(C=L.n()).done;){var M=C.value;o[M][l]=M===S?"top":B?"both":"none"}}catch(t){L.e(t)}finally{L.f()}var P,I=Math.max.apply(Math,c),T=r(c);try{for(T.s();!(P=T.n()).done;){var z=P.value;o[z][l]=z===I?"bottom":B?"both":"none"}}catch(t){T.e(t)}finally{T.f()}}else if(1===d){o[h[0]||c[0]][l]="both"}}return o}';

function patchMinifiedBundle(rel) {
  const p = path.join(apex, rel);
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, "utf8");
  if (s.includes(MARKER)) return;
  if (!s.includes(MIN_OLD)) {
    console.warn(`[patch-apexcharts] ${rel}: expected minified block not found (apexcharts version changed?)`);
    return;
  }
  fs.writeFileSync(p, s.split(MIN_OLD).join(MIN_NEW));
  console.log(`[patch-apexcharts] patched ${rel}`);
}

function patchHelpersSource() {
  const p = path.join(apex, "src", "charts", "common", "bar", "Helpers.js");
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, "utf8");
  if (s.includes("radiusWhenStackedAll")) return;

  const headOld = `  createBorderRadiusArr(series) {
    const w = this.w

    const alwaysApplyRadius =
      !this.w.config.chart.stacked || w.config.plotOptions.bar.borderRadius <= 0
`;
  const headNew = `  createBorderRadiusArr(series) {
    const w = this.w

    const radiusWhenStackedAll =
      w.config.plotOptions.bar.borderRadiusWhenStacked === 'all'
    const midStackRadius = radiusWhenStackedAll ? 'both' : 'none'

    const alwaysApplyRadius =
      !this.w.config.chart.stacked || w.config.plotOptions.bar.borderRadius <= 0
`;
  if (!s.includes(headOld)) {
    console.warn("[patch-apexcharts] Helpers.js: unexpected header, skip");
    return;
  }
  s = s.replace(headOld, headNew);

  s = s.replace(
    `            } else if (i === lastPositiveIndex) {
              output[i][j] = 'top'
            } else {
              output[i][j] = 'none'
            }
          }
        }
      } else if (negativeIndices.length > 0 && positiveIndices.length === 0) {`,
    `            } else if (i === lastPositiveIndex) {
              output[i][j] = 'top'
            } else {
              output[i][j] = midStackRadius
            }
          }
        }
      } else if (negativeIndices.length > 0 && positiveIndices.length === 0) {`,
  );

  s = s.replace(
    `            } else if (i === lowestNegativeIndex) {
              output[i][j] = 'top' // Farthest from axis
            } else {
              output[i][j] = 'none'
            }
          }
        }
      } else if (positiveIndices.length > 0 && negativeIndices.length > 0) {`,
    `            } else if (i === lowestNegativeIndex) {
              output[i][j] = 'top' // Farthest from axis
            } else {
              output[i][j] = midStackRadius
            }
          }
        }
      } else if (positiveIndices.length > 0 && negativeIndices.length > 0) {`,
  );

  s = s.replace(
    `          if (i === lastPositiveIndex) {
            output[i][j] = 'top'
          } else {
            output[i][j] = 'none'
          }
        }
        // Assign 'bottom' to the highest negative index (closest to axis)`,
    `          if (i === lastPositiveIndex) {
            output[i][j] = 'top'
          } else {
            output[i][j] = midStackRadius
          }
        }
        // Assign 'bottom' to the highest negative index (closest to axis)`,
  );

  s = s.replace(
    `          if (i === highestNegativeIndex) {
            output[i][j] = 'bottom'
          } else {
            output[i][j] = 'none'
          }
        }
      } else if (nonZeroCount === 1) {`,
    `          if (i === highestNegativeIndex) {
            output[i][j] = 'bottom'
          } else {
            output[i][j] = midStackRadius
          }
        }
      } else if (nonZeroCount === 1) {`,
  );

  fs.writeFileSync(p, s);
  console.log("[patch-apexcharts] patched src/charts/common/bar/Helpers.js");
}

function patchApexchartsJs() {
  const p = path.join(apex, "dist", "apexcharts.js");
  if (!fs.existsSync(p)) return;
  let s = fs.readFileSync(p, "utf8");
  if (s.includes("var radiusWhenStackedAll = w.config.plotOptions.bar.borderRadiusWhenStacked === 'all'")) {
    return;
  }

  const wBlock = `        var w = this.w;
        var alwaysApplyRadius = !this.w.config.chart.stacked || w.config.plotOptions.bar.borderRadius <= 0;
        var numSeries = series.length;`;

  const wBlockNew = `        var w = this.w;
        var radiusWhenStackedAll = w.config.plotOptions.bar.borderRadiusWhenStacked === 'all';
        var midStackRadius = radiusWhenStackedAll ? 'both' : 'none';
        var alwaysApplyRadius = !this.w.config.chart.stacked || w.config.plotOptions.bar.borderRadius <= 0;
        var numSeries = series.length;`;

  if (!s.includes(wBlock)) {
    console.warn("[patch-apexcharts] apexcharts.js: unexpected createBorderRadiusArr prelude");
    return;
  }
  s = s.replace(wBlock, wBlockNew);

  s = s.replace(
    `                  } else if (_i2 === lastPositiveIndex) {
                    output[_i2][_j2] = 'top';
                  } else {
                    output[_i2][_j2] = 'none';
                  }`,
    `                  } else if (_i2 === lastPositiveIndex) {
                    output[_i2][_j2] = 'top';
                  } else {
                    output[_i2][_j2] = midStackRadius;
                  }`,
  );

  s = s.replace(
    `                  } else if (_i3 === lowestNegativeIndex) {
                    output[_i3][_j2] = 'top'; // Farthest from axis
                  } else {
                    output[_i3][_j2] = 'none';
                  }`,
    `                  } else if (_i3 === lowestNegativeIndex) {
                    output[_i3][_j2] = 'top'; // Farthest from axis
                  } else {
                    output[_i3][_j2] = midStackRadius;
                  }`,
  );

  s = s.replace(
    `                if (_i4 === _lastPositiveIndex) {
                  output[_i4][_j2] = 'top';
                } else {
                  output[_i4][_j2] = 'none';
                }`,
    `                if (_i4 === _lastPositiveIndex) {
                  output[_i4][_j2] = 'top';
                } else {
                  output[_i4][_j2] = midStackRadius;
                }`,
  );

  s = s.replace(
    `                if (_i5 === _highestNegativeIndex) {
                  output[_i5][_j2] = 'bottom';
                } else {
                  output[_i5][_j2] = 'none';
                }`,
    `                if (_i5 === _highestNegativeIndex) {
                  output[_i5][_j2] = 'bottom';
                } else {
                  output[_i5][_j2] = midStackRadius;
                }`,
  );

  fs.writeFileSync(p, s);
  console.log("[patch-apexcharts] patched dist/apexcharts.js");
}

patchMinifiedBundle(path.join("dist", "apexcharts.common.js"));
patchMinifiedBundle(path.join("dist", "apexcharts.esm.js"));
patchMinifiedBundle(path.join("dist", "apexcharts.min.js"));
patchHelpersSource();
patchApexchartsJs();
