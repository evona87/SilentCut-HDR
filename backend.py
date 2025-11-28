from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from Bio.Seq import Seq
from Bio.Restriction import CommOnly, Analysis, RestrictionBatch
from collections import defaultdict

app = FastAPI()

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DNAInput(BaseModel):
    sequence: str

def find_synonymous_codons(codon: str) -> list:
    ref_aa = str(Seq(codon).translate())
    synonymous_codons = set()
    bases = ["A", "T", "G", "C"]
    for i in range(3):
        for b in bases:
            if b != codon[i]:
                mutated = list(codon)
                mutated[i] = b
                new_codon = "".join(mutated)
                try:
                    aa = str(Seq(new_codon).translate())
                    if aa == ref_aa:
                        synonymous_codons.add(new_codon)
                except:
                    continue
    synonymous_codons.add(codon)
    return sorted(synonymous_codons)

def find_restriction_sites(dna_sequence: str) -> dict:
    seq = Seq(dna_sequence)
    enzymes = CommOnly
    analysis = Analysis(enzymes, seq)
    result = analysis.full()

    enzyme_cuts = {}
    for enzyme in enzymes:
        name = str(enzyme)
        positions = result.get(enzyme, [])
        if not positions:
            continue

        site_len = enzyme.size
        cut_offset = enzyme.fst5

        top_positions = [p + cut_offset for p in positions]
        bottom_positions = [len(seq) - (p + site_len - cut_offset) for p in positions]

        enzyme_cuts[name] = {
            "top": sorted(set(top_positions)),
            "bottom": sorted(set(bottom_positions))
        }

    return enzyme_cuts


def generate_syn_mutants_with_new_sites(dna_seq: str):
    dna_seq = dna_seq.upper()
    if len(dna_seq) % 3 != 0:
        raise ValueError("DNA sequence length must be a multiple of 3")

    codons = [dna_seq[i:i+3] for i in range(0, len(dna_seq), 3)]
    original_sites = find_restriction_sites(dna_seq)
    original_enzymes = set(original_sites.keys())

    results = []

    for i, codon in enumerate(codons):
        synonyms = find_synonymous_codons(codon)
        for alt in synonyms:
            if alt != codon:
                mutated_codons = codons.copy()
                mutated_codons[i] = alt
                mutated_seq = ''.join(mutated_codons)
                mutated_sites = find_restriction_sites(mutated_seq)
                mutated_enzymes = set(mutated_sites.keys())

                new_enzymes = mutated_enzymes - original_enzymes
                if new_enzymes:
                    new_sites = {k: mutated_sites[k] for k in new_enzymes}
                    results.append({
                        "mutated_sequence": mutated_seq,
                        "codon_position": i,
                        "original_codon": codon,
                        "mutated_codon": alt,
                        "new_enzymes": new_sites
                    })

    return results

from fastapi import Query
from Bio.Restriction import __dict__ as restriction_dict

@app.get("/enzyme_info")
def enzyme_info(name: str = Query(..., description="Enzyme name, e.g., EcoRI")):
    if name not in restriction_dict:
        return {"error": f"Enzyme '{name}' not found in Biopython's REBASE."}

    enzyme = restriction_dict[name]
    site = enzyme.site
    cut5 = enzyme.fst5
    cut3 = enzyme.fst3

    comp = str(Seq(site).complement())
    cut_type = (
        "Blunt end" if enzyme.is_blunt() else
        "5' overhang" if enzyme.is_5overhang() else
        "3' overhang" if enzyme.is_3overhang() else
        "Unknown"
    )

    return {
        "name": enzyme.__name__,
        "site": site,
        "cut5": cut5,
        "cut3": cut3,
        "cut_type": cut_type,
        "representation": {
            "top": f"{site[:cut5]}↓{site[cut5:]}",
            "bottom": f"{comp[:cut3]}↑{comp[cut3:]}"
        }
    }

@app.post("/analyze")
def analyze_synonymous_mutations(input_data: DNAInput):
    try:
        mutations = generate_syn_mutants_with_new_sites(input_data.sequence)
        return {"results": mutations}
    except Exception as e:
        return {"error": str(e)}
