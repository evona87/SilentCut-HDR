const degenerateBases = {
  N: ["A", "T", "C", "G"],
  Y: ["C", "T"],
  R: ["A", "G"],
  K: ["G", "T"],
  M: ["A", "C"],
  S: ["C", "G"],
  W: ["A", "T"],
  B: ["C", "G", "T"],
  D: ["A", "G", "T"],
  H: ["A", "C", "T"],
  V: ["A", "C", "G"],
};

function complement(seq) {
  const complementMap = {
    A: "T", T: "A", C: "G", G: "C",
    Y: "R", R: "Y", K: "M", M: "K",
    S: "S", W: "W", B: "V", D: "H",
    H: "D", V: "B", N: "N",
  };
  return seq.toUpperCase().split("").map(b => complementMap[b] || b).join("");
}

function buildDegenerateRegex(pattern) {
  const re = pattern
    .toUpperCase()
    .split("")
    .map(base => degenerateBases[base] ? `[${degenerateBases[base].join("")}]` : base)
    .join("");
  return new RegExp(re, "g");
}

function findCutsInSequence(sequence, enzymeData) {
  const repTopRaw = enzymeData.representation.top;
  const repBottomRaw = enzymeData.representation.bottom;

  const topArrowIndex = repTopRaw.indexOf("↓");
  const bottomArrowIndex = repBottomRaw.indexOf("↑");

  if (topArrowIndex === -1 || bottomArrowIndex === -1) {
    console.warn("Missing arrows in enzyme pattern:", enzymeData);
    return [];
  }

  const patternTop = repTopRaw.replace("↓", "");
  const motifLen = patternTop.length;

  const regexTop = buildDegenerateRegex(patternTop);
  const cuts = [];
  let match;

  while ((match = regexTop.exec(sequence)) !== null) {
    const start = match.index;
    const end = start + motifLen;

    const topCut = start + topArrowIndex;
    const bottomCut = start + bottomArrowIndex;

    cuts.push({ start, end, topCut, bottomCut });

    if (regexTop.lastIndex === match.index) regexTop.lastIndex++;
  }

  return cuts;
}

// --------------------- MUTATION DETECTION ---------------------
function getMutationIndex(originalCodon, mutatedCodon) {
  if (!originalCodon || !mutatedCodon) return -1;
  if (originalCodon.length !== 3 || mutatedCodon.length !== 3) return -1;

  for (let i = 0; i < 3; i++) {
    if (originalCodon[i] !== mutatedCodon[i]) return i;
  }
  return -1;
}

// --------------------- VISUALIZATION --------------------------
function generateVisualization(sequence, codonIndex, cuts, mutationIndex) {
  const topStrand = sequence.toUpperCase();
  const bottomStrand = complement(topStrand);

  const codonStart = codonIndex != null ? codonIndex * 3 : -1;
  const mutatedBaseIndex = mutationIndex >= 0 ? codonStart + mutationIndex : -1;

  const seqInner = document.getElementById("seq-inner");
  seqInner.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  const topLine = document.createElement("div");
  topLine.className = "dna-line dna-line-top";

  const bottomLine = document.createElement("div");
  bottomLine.className = "dna-line dna-line-bottom";

  const dir5Top = document.createElement("span");
  dir5Top.className = "strand-direction";
  dir5Top.textContent = "5'";

  const dir3Top = document.createElement("span");
  dir3Top.className = "strand-direction right";
  dir3Top.textContent = "3'";

  const dir3Bottom = document.createElement("span");
  dir3Bottom.className = "strand-direction";
  dir3Bottom.textContent = "3'";

  const dir5Bottom = document.createElement("span");
  dir5Bottom.className = "strand-direction right";
  dir5Bottom.textContent = "5'";

  const basesTop = document.createElement("span");
  basesTop.className = "dna-bases";

  const basesBottom = document.createElement("span");
  basesBottom.className = "dna-bases";

  const siteHighlight = new Array(topStrand.length).fill(false);
  cuts.forEach(c => {
    for (let i = c.start; i < c.end; i++) siteHighlight[i] = true;
  });

  for (let i = 0; i < topStrand.length; i++) {
    const spanTop = document.createElement("span");
    spanTop.className = "dna-base dna-base-top";
    spanTop.dataset.index = i;

    const spanBottom = document.createElement("span");
    spanBottom.className = "dna-base dna-base-bottom";
    spanBottom.dataset.index = i;

    spanTop.textContent = topStrand[i];
    spanBottom.textContent = bottomStrand[i];

    if (siteHighlight[i]) {
      spanTop.classList.add("site-highlight");
      spanBottom.classList.add("site-highlight");
    }

    if (i === mutatedBaseIndex) {
      spanTop.classList.add("mut-base");
      spanBottom.classList.add("mut-base");
    }

    basesTop.appendChild(spanTop);
    basesBottom.appendChild(spanBottom);
  }

  topLine.appendChild(dir5Top);
  topLine.appendChild(basesTop);
  topLine.appendChild(dir3Top);

  bottomLine.appendChild(dir3Bottom);
  bottomLine.appendChild(basesBottom);
  bottomLine.appendChild(dir5Bottom);

  wrapper.appendChild(topLine);
  wrapper.appendChild(bottomLine);
  seqInner.appendChild(wrapper);
}

// --------------------- ARROWS ---------------------
function clearArrows() {
  document.querySelectorAll(".cut-arrow").forEach((el) => el.remove());
  document.querySelectorAll(".cut-item").forEach((li) => li.classList.remove("active"));
}

function activateCut(cutIndex, cuts) {
  clearArrows();
  const cut = cuts[cutIndex];
  if (!cut) return;

  const seqInner = document.getElementById("seq-inner");
  const wrapper = seqInner.querySelector("div");
  const containerRect = wrapper.getBoundingClientRect();

  const topBases = document.querySelectorAll(".dna-base-top");
  const bottomBases = document.querySelectorAll(".dna-base-bottom");

  function getCutX(list, cutPos) {
    const n = list.length;

    if (cutPos <= 0) {
      const r = list[0].getBoundingClientRect();
      return r.left - containerRect.left - r.width * 0.25;
    }
    if (cutPos >= n) {
      const r = list[n - 1].getBoundingClientRect();
      return r.right - containerRect.left + r.width * 0.25;
    }

    const leftRect = list[cutPos - 1].getBoundingClientRect();
    const rightRect = list[cutPos].getBoundingClientRect();
    return (leftRect.right + rightRect.left) / 2 - containerRect.left;
  }

  const topCutX = getCutX(topBases, cut.topCut);
  const bottomCutX = getCutX(bottomBases, cut.bottomCut);

  const arrowTop = document.createElement("div");
  arrowTop.className = "cut-arrow top";
  arrowTop.textContent = "↓";
  arrowTop.style.left = `${topCutX}px`;
  arrowTop.style.top = `${topBases[0].getBoundingClientRect().top - containerRect.top - 18}px`;
  wrapper.appendChild(arrowTop);

  const arrowBottom = document.createElement("div");
  arrowBottom.className = "cut-arrow bottom";
  arrowBottom.textContent = "↑";
  arrowBottom.style.left = `${bottomCutX}px`;
  arrowBottom.style.top = `${bottomBases[0].getBoundingClientRect().bottom - containerRect.top - 8}px`;
  wrapper.appendChild(arrowBottom);

  const li = document.querySelector(`.cut-item[data-cut-index="${cutIndex}"]`);
  if (li) li.classList.add("active");
}

// --------------------- MAIN ---------------------
async function main() {
  const params = new URLSearchParams(window.location.search);
  const enzyme = params.get("name");
  const rawSeq = params.get("sequence") || "";
  const sequence = rawSeq.toUpperCase().replace(/[^ATGCRYMKSWBDHVN]/g, "");

  const originalCodon = params.get("original");
  const mutatedCodon = params.get("mutated");
  const codonPosition = params.get("codon_position");
  const codonIndex = codonPosition ? parseInt(codonPosition) : null;

  const mutationIndex = getMutationIndex(originalCodon, mutatedCodon);

  const metaError = document.getElementById("meta-error");

  if (!enzyme || !sequence) {
    metaError.textContent = "Missing enzyme name or DNA sequence.";
    metaError.style.display = "block";
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/enzyme_info?name=${encodeURIComponent(enzyme)}`
    );
    if (!response.ok) throw new Error("Cannot load enzyme info");

    const enzymeData = await response.json();

    document.getElementById("enzyme-title").textContent = "Enzyme: " + enzyme;
    document.getElementById("meta-name").textContent = enzyme;
    document.getElementById("meta-site").textContent = enzymeData.site;
    document.getElementById("meta-type").textContent = enzymeData.cut_type;
    document.getElementById("meta-cut5").textContent = enzymeData.cut5;
    document.getElementById("meta-cut3").textContent = enzymeData.cut3;
    document.getElementById("meta-grid").style.display = "grid";

    document.getElementById("pattern-pre").textContent =
      `5' ${enzymeData.representation.top} 3'\n` +
      `3' ${enzymeData.representation.bottom} 5'`;
    document.getElementById("pattern-box").style.display = "block";

    // ---------------- NEW MUTATION BOX ----------------
    if (originalCodon && mutatedCodon) {
      document.getElementById("mut-original").textContent = originalCodon;
      document.getElementById("mut-mutated").textContent = mutatedCodon;

      if (mutationIndex >= 0) {
        document.getElementById("mut-base").textContent =
          `${originalCodon[mutationIndex]} → ${mutatedCodon[mutationIndex]}`;
      } else {
        document.getElementById("mut-base").textContent = "—";
      }

      document.getElementById("mut-pos").textContent = codonIndex;
      document.getElementById("mutation-box").style.display = "block";
    }
    // ---------------------------------------------------

    const cuts = findCutsInSequence(sequence, enzymeData);
    generateVisualization(sequence, codonIndex, cuts, mutationIndex);

    document.getElementById("seq-container").style.display = "block";

    const cutList = document.getElementById("cut-list");
    cutList.innerHTML = "";

    if (cuts.length === 0) {
      document.getElementById("no-cuts-msg").style.display = "block";
    } else {
      document.getElementById("no-cuts-msg").style.display = "none";

      cuts.forEach((c, idx) => {
        const li = document.createElement("li");
        li.className = "cut-item";
        li.dataset.cutIndex = idx;

        const left = document.createElement("span");
        left.textContent = `${enzyme} – cut #${idx + 1}`;

        const right = document.createElement("span");
        right.className = "cut-pos";
        right.textContent = `top: ${c.topCut + 1}, bottom: ${c.bottomCut + 1}`;

        li.appendChild(left);
        li.appendChild(right);

        li.addEventListener("mouseenter", () => activateCut(idx, cuts));
        li.addEventListener("mouseleave", () => clearArrows());

        cutList.appendChild(li);
      });

      activateCut(0, cuts);
    }
  } catch (err) {
    console.error(err);
    metaError.textContent = err.message;
    metaError.style.display = "block";
  }
}

main();
