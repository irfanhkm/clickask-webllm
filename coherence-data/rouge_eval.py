import sys
import json
from rouge_score import rouge_scorer

folder = sys.argv[1] if len(sys.argv) > 1 else 'llama7b'
name = sys.argv[2]
data_file = f'{folder}/output/{name}'

def load_data(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

data = load_data(data_file)

scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)

total_scores = {
    'rouge1': {'precision': 0, 'recall': 0, 'f1': 0},
    'rouge2': {'precision': 0, 'recall': 0, 'f1': 0},
    'rougeL': {'precision': 0, 'recall': 0, 'f1': 0},
}
count = 0

for item in data:
    ref = item.get('short_summary', '')
    cand = item.get('reply', '')
    if not ref or not cand:
        continue
    scores = scorer.score(ref, cand)
    count += 1
    for key in total_scores.keys():
        total_scores[key]['precision'] += scores[key].precision
        total_scores[key]['recall'] += scores[key].recall
        total_scores[key]['f1'] += scores[key].fmeasure

print(f"Average ROUGE scores over {count} items:")
for key, vals in total_scores.items():
    print(f"{key}: Precision={vals['precision']/count:.3f}, Recall={vals['recall']/count:.3f}, F1={vals['f1']/count:.3f}")
