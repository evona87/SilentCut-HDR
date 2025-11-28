
function openEnzymePage(enzyme, sequence, codonPosition = null, originalCodon = null, mutatedCodon = null) {
    const encodedName = encodeURIComponent(enzyme);
    const encodedSeq = encodeURIComponent(sequence);

    let url = `enzyme_view.html?name=${encodedName}&sequence=${encodedSeq}`;

    if (codonPosition !== null && originalCodon && mutatedCodon) {
        url += `&codon_position=${encodeURIComponent(codonPosition)}&original=${encodeURIComponent(originalCodon)}&mutated=${encodeURIComponent(mutatedCodon)}`;
    }

    window.open(url, '_blank');
}

async function loadEnzymePreview(enzyme, sequence, codonPosition = null, originalCodon = null, mutatedCodon = null) {
    const container = document.getElementById('enzyme-preview-container');
    container.innerHTML = '<p>Loading enzyme information...</p>';
    container.style.display = 'block';

    try {
        const response = await fetch(`http://127.0.0.1:8000/enzyme_info?name=${encodeURIComponent(enzyme)}`);
        if (!response.ok) throw new Error('Failed to fetch enzyme info');
        const data = await response.json();

        let url = `enzyme_view.html?name=${encodeURIComponent(enzyme)}&sequence=${encodeURIComponent(sequence)}`;
        if (codonPosition !== null && originalCodon && mutatedCodon) {
            url += `&codon_position=${encodeURIComponent(codonPosition)}&original=${encodeURIComponent(originalCodon)}&mutated=${encodeURIComponent(mutatedCodon)}`;
        }

        container.innerHTML = `
            <div style="background: #eef7ff; padding: 15px; border-radius: 6px;">
                <h3>${enzyme}</h3>
                <p><strong>Recognition Site:</strong> ${data.site}</p>
                <p><strong>Cut Type:</strong> ${data.cut_type}</p>
                <pre style="background:#f0f0f0;padding:10px;border-radius:4px;">
5' ${data.representation.top} 3'
3' ${data.representation.bottom} 5'
                </pre>
                <button style="margin-top: 10px;" onclick="window.open('${url}', '_blank')">View full page</button>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
}


document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const dnaSequenceInput = document.getElementById('dna-sequence');
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

    analyzeBtn.addEventListener('click', async function() {
        const sequence = dnaSequenceInput.value.trim().toUpperCase();
        
        if (!sequence) {
            showError('Please enter a DNA sequence');
            return;
        }

        const invalidChars = sequence.match(/[^ATGC]/g);
        if (invalidChars) {
            showError(`Invalid characters in DNA sequence: ${invalidChars.join(', ')}`);
            return;
        }

        if (sequence.length % 3 !== 0) {
            showError('DNA sequence length must be a multiple of 3 (complete codons)');
            return;
        }

        resultsDiv.style.display = 'none';
        errorMessage.style.display = 'none';

        analyzeBtn.disabled = true;
        loadingIndicator.style.display = 'inline-block';

        try {
            const response = await fetch('http://127.0.0.1:8000/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sequence: sequence })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to analyze sequence');
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            displayResults(data.results, sequence);
            resultsDiv.style.display = 'block';

        } catch (err) {
            showError(err.message);
        } finally {
            analyzeBtn.disabled = false;
            loadingIndicator.style.display = 'none';
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function displayResults(results, originalSequence) {
        resultsContent.innerHTML = '';

        if (!results || results.length === 0) {
            resultsContent.innerHTML = '<p>No synonymous mutations creating new restriction sites were found.</p>';
            return;
        }

        const groupedByCodon = {};
        results.forEach(result => {
            if (!groupedByCodon[result.codon_position]) {
                groupedByCodon[result.codon_position] = [];
            }
            groupedByCodon[result.codon_position].push(result);
        });

        for (const [position, codonMutations] of Object.entries(groupedByCodon)) {
            const positionDiv = document.createElement('div');
            positionDiv.className = 'mutation';

            const codonNumber = parseInt(position) + 1;
            const originalCodon = codonMutations[0].original_codon;

            const optionsContainer = document.createElement('div');
            optionsContainer.style.margin = '10px 0';

            if (codonMutations.length > 1) {
                const select = document.createElement('select');
                select.style.marginRight = '10px';
                select.style.padding = '5px';

                codonMutations.forEach((mutation, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${mutation.mutated_codon} (${Object.keys(mutation.new_enzymes).join(', ')})`;
                    select.appendChild(option);
                });

                select.addEventListener('change', (e) => {
                    showSelectedMutation(codonMutations[e.target.value], codonNumber, originalCodon, mutationDisplay);
                });

                optionsContainer.innerHTML = `<strong>Select mutation:</strong> `;
                optionsContainer.appendChild(select);
            }

            const mutationDisplay = document.createElement('div');

            positionDiv.innerHTML = `
                <h3>Codon ${codonNumber}</h3>
                <p>Original: <strong>${originalCodon}</strong></p>
            `;

            positionDiv.appendChild(optionsContainer);
            positionDiv.appendChild(mutationDisplay);

            showSelectedMutation(codonMutations[0], codonNumber, originalCodon, mutationDisplay);

            resultsContent.appendChild(positionDiv);
        }

        function showSelectedMutation(mutation, codonNumber, originalCodon, container) {
            const mutatedSequence = mutation.mutated_sequence;
            const mutatedCodon = mutation.mutated_codon;
            const codonPosition = mutation.codon_position;

            const seqStart = Math.max(0, codonPosition * 3 - 15);
            const seqEnd = Math.min(mutatedSequence.length, (codonPosition + 1) * 3 + 15);
            const context = mutatedSequence.slice(seqStart, seqEnd);

            const codonStartInContext = codonPosition * 3 - seqStart;
            const codonEndInContext = codonStartInContext + 3;

            let highlighted = '';
            for (let i = 0; i < context.length; i++) {
                if (i >= codonStartInContext && i < codonEndInContext) {
                    highlighted += `<span style="background-color: #ffcccc; font-weight: bold;">${context[i]}</span>`;
                } else {
                    highlighted += context[i];
                }
            }

            container.innerHTML = `
                <p>Mutated to: <strong>${mutatedCodon}</strong></p>
                <div class="sequence-highlight">${highlighted}</div>
                <p><strong>New restriction enzymes created:</strong></p>
                <div class="enzyme-list">
                    ${Object.keys(mutation.new_enzymes).map(enzyme => 
                        `<span class="enzyme-tag" onclick="loadEnzymePreview(
                            '${enzyme}', 
                            '${mutatedSequence}', 
                            ${codonPosition}, 
                            '${originalCodon}', 
                            '${mutatedCodon}'
                        )">${enzyme}</span>`
                    ).join('')}
                </div>
            `;
        }
    }
});

// ------------------
// MODAL
// ------------------
async function showEnzymeInfo(enzymeName) {
    const modal = document.getElementById('enzyme-modal');
    const modalTitle = document.getElementById('enzyme-modal-title');
    const modalContent = document.getElementById('enzyme-modal-content');
    
    modalTitle.textContent = `Enzyme: ${enzymeName}`;
    modalContent.innerHTML = '<p>Loading enzyme information...</p>';
    modal.style.display = 'flex';
    
    try {
        const response = await fetch(`http://127.0.0.1:8000/enzyme_info?name=${encodeURIComponent(enzymeName)}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch enzyme info');
        }
        
        const data = await response.json();
        
        modalContent.innerHTML = `
            <p><strong>Recognition Site:</strong> ${data.site}</p>
            <p><strong>Cut Type:</strong> ${data.cut_type}</p>
            <p><strong>Cut Positions:</strong> 5' at ${data.cut5}, 3' at ${data.cut3}</p>
            <div style="margin-top: 15px;">
                <p><strong>Visual Representation:</strong></p>
                <div style="font-family: monospace; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
                    <div>5' ${data.representation.top} 3' (Top strand)</div>
                    <div>3' ${data.representation.bottom} 5' (Bottom strand)</div>
                </div>
            </div>
        `;
        
    } catch (err) {
        modalContent.innerHTML = `<div class="error">Error: ${err.message}</div>`;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const dnaInput = document.getElementById("dna-sequence");
    const seqLengthDisplay = document.getElementById("sequence-length");

    function updateSequenceLength() {
        const seq = dnaInput.value.trim().toUpperCase();
        const clean = seq.replace(/[^ATGCatgc]/g, ""); 

        const length = clean.length;
        seqLengthDisplay.textContent = length.toString();

        seqLengthDisplay.style.color = (length % 3 === 0)
            ? "var(--secondary)"
            : "var(--danger)";
    }

    dnaInput.addEventListener("input", updateSequenceLength);
    updateSequenceLength();
});
