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
        A: "T",
        T: "A",
        C: "G",
        G: "C",
        Y: "R",
        R: "Y",
        K: "M",
        M: "K",
        S: "S",
        W: "W",
        B: "V",
        D: "H",
        H: "D",
        V: "B",
        N: "N",
      };
      return seq
        .toUpperCase()
        .split("")
        .map((b) => complementMap[b] || b)
        .join("");
    }

    function buildDegenerateRegex(pattern) {
      const re = pattern
        .toUpperCase()
        .split("")
        .map((base) => {
          if (degenerateBases[base]) {
            return "[" + degenerateBases[base].join("") + "]";
          }
          return base;
        })
        .join("");
      return new RegExp(re, "g");
    }

    // Find all cut positions on the top strand and derive bottom strand cut index
    function findCutsInSequence(sequence, enzymeData) {
      const site = enzymeData.site.toUpperCase(); // recognition site (top strand)
      const cut5 = enzymeData.cut5; // position inside site for top strand cut
      const cut3 = enzymeData.cut3; // position (in same orientation) for bottom cut

      const regex = buildDegenerateRegex(site);
      const cuts = [];
      let match;

      while ((match = regex.exec(sequence)) !== null) {
        const start = match.index;
        const end = start + site.length;
        const topCut = start + cut5;
        const bottomCut = start + cut3;
        cuts.push({ start, end, topCut, bottomCut });

        if (regex.lastIndex === match.index) regex.lastIndex++;
      }
      return cuts;
    }

    function generateVisualization(sequence, codonIndex, cuts) {
      const topStrand = sequence.toUpperCase();
      const bottomStrand = complement(topStrand);

      const codonStart = codonIndex != null ? codonIndex * 3 : -1;
      const codonEnd = codonStart + 3;

      const seqInner = document.getElementById("seq-inner");
      seqInner.innerHTML = "";

      // Create a wrapper to position elements properly
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

      // mark recognition sites (for all cuts combined)
      const siteHighlight = new Array(topStrand.length).fill(false);
      cuts.forEach((c) => {
        for (let i = c.start; i < c.end; i++) siteHighlight[i] = true;
      });

      for (let i = 0; i < topStrand.length; i++) {
        const highlightCodon = i >= codonStart && i < codonEnd;

        const spanTop = document.createElement("span");
        spanTop.className = "dna-base dna-base-top";
        spanTop.dataset.index = i;
        spanTop.textContent = topStrand[i];
        if (highlightCodon) spanTop.classList.add("mutated-codon");
        if (siteHighlight[i]) spanTop.classList.add("site-highlight");

        const spanBottom = document.createElement("span");
        spanBottom.className = "dna-base dna-base-bottom";
        spanBottom.dataset.index = i;
        spanBottom.textContent = bottomStrand[i];
        if (highlightCodon) spanBottom.classList.add("mutated-codon");
        if (siteHighlight[i]) spanBottom.classList.add("site-highlight");

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

    function clearArrows() {
      document
        .querySelectorAll(".cut-arrow")
        .forEach((el) => el.parentNode.removeChild(el));
      document
        .querySelectorAll(".cut-item")
        .forEach((li) => li.classList.remove("active"));
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

      function getCutPosition(list, cutPos) {
        if (cutPos <= 0) {
          const firstBase = list[0];
          const rect = firstBase.getBoundingClientRect();
          return {
            x: rect.left - containerRect.left - rect.width / 2,
            base: firstBase
          };
        }
        if (cutPos >= list.length) {
          const lastBase = list[list.length - 1];
          const rect = lastBase.getBoundingClientRect();
          return {
            x: rect.right - containerRect.left + rect.width / 2,
            base: lastBase
          };
        }
        
        // Cut is between two bases
        const leftBase = list[cutPos - 1];
        const rightBase = list[cutPos];
        const leftRect = leftBase.getBoundingClientRect();
        const rightRect = rightBase.getBoundingClientRect();
        
        return {
          x: (leftRect.right + rightRect.left) / 2 - containerRect.left,
          base: leftBase
        };
      }

      const topCutPos = getCutPosition(topBases, cut.topCut);
      const bottomCutPos = getCutPosition(bottomBases, cut.bottomCut);

      // Only show arrows if the cut position is within a highlighted recognition site
      const isTopCutInSite = cut.topCut >= cut.start && cut.topCut <= cut.end;
      const isBottomCutInSite = cut.bottomCut >= cut.start && cut.bottomCut <= cut.end;

      // Top strand arrow (pointing downward) - placed OVER the top strand
      if (isTopCutInSite) {
        const arrowTop = document.createElement("div");
        arrowTop.className = "cut-arrow top";
        arrowTop.style.left = `${topCutPos.x}px`;
        
        // Position OVER top strand (above the bases)
        const topLine = document.querySelector(".dna-line-top");
        const topLineRect = topLine.getBoundingClientRect();
        arrowTop.style.top = `${topLineRect.top - containerRect.top - 15}px`;
        
        arrowTop.textContent = "↓";
        wrapper.appendChild(arrowTop);
      }

      // Bottom strand arrow (pointing upward) - placed UNDER the bottom strand
      if (isBottomCutInSite) {
        const arrowBottom = document.createElement("div");
        arrowBottom.className = "cut-arrow bottom";
        arrowBottom.style.left = `${bottomCutPos.x}px`;
        
        // Position UNDER bottom strand (below the bases)
        const bottomLine = document.querySelector(".dna-line-bottom");
        const bottomLineRect = bottomLine.getBoundingClientRect();
        arrowBottom.style.top = `${bottomLineRect.bottom - containerRect.top + 15}px`;
        
        arrowBottom.textContent = "↑";
        wrapper.appendChild(arrowBottom);
      }

      const li = document.querySelector(
        `.cut-item[data-cut-index="${cutIndex}"]`
      );
      if (li) li.classList.add("active");
    }

    async function main() {
      const params = new URLSearchParams(window.location.search);
      const enzyme = params.get("name");
      const rawSeq = params.get("sequence") || "";
      const sequence = rawSeq.toUpperCase().replace(/[^ATGCRYMKSWBDHVN]/g, "");
      const codonPosition = params.get("codon_position");
      const codonIndex =
        codonPosition !== null && codonPosition !== ""
          ? parseInt(codonPosition, 10)
          : null;

      const metaError = document.getElementById("meta-error");
      const seqError = document.getElementById("seq-error");

      if (!enzyme || !sequence) {
        metaError.textContent =
          "Missing enzyme name or DNA sequence in URL parameters.";
        metaError.style.display = "block";
        return;
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/enzyme_info?name=${encodeURIComponent(
            enzyme
          )}`
        );
        if (!response.ok) {
          throw new Error("Could not load enzyme info from backend.");
        }
        const enzymeData = await response.json();

        // Metadata
        document.getElementById("enzyme-title").textContent =
          "Enzyme: " + (enzymeData.name || enzyme);
        document.getElementById("meta-name").textContent =
          enzymeData.name || enzyme;
        document.getElementById("meta-site").textContent = enzymeData.site;
        document.getElementById("meta-type").textContent = enzymeData.cut_type;
        document.getElementById("meta-cut5").textContent = enzymeData.cut5;
        document.getElementById("meta-cut3").textContent = enzymeData.cut3;
        document.getElementById("meta-grid").style.display = "grid";

        document.getElementById("pattern-pre").textContent =
          `5' ${enzymeData.representation.top} 3'\n` +
          `3' ${enzymeData.representation.bottom} 5'`;
        document.getElementById("pattern-box").style.display = "block";

        // Cuts & visualization
        const cuts = findCutsInSequence(sequence, enzymeData);
        generateVisualization(sequence, codonIndex, cuts);
        document.getElementById("seq-container").style.display = "block";

        const cutList = document.getElementById("cut-list");
        cutList.innerHTML = "";

        if (!cuts.length) {
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
            right.textContent = `top: ${c.topCut + 1}, bottom: ${
              c.bottomCut + 1
            }`;

            li.appendChild(left);
            li.appendChild(right);

            li.addEventListener("mouseenter", () => activateCut(idx, cuts));
            li.addEventListener("mouseleave", () => clearArrows());

            cutList.appendChild(li);
          });

          // Show first cut by default
          activateCut(0, cuts);
        }
      } catch (err) {
        console.error(err);
        metaError.textContent = err.message;
        metaError.style.display = "block";
        seqError.textContent = "Visualization could not be created.";
        seqError.style.display = "block";
      }
    }

    main();
