from typing import List, Tuple
from functools import reduce
import inspect

def run_case(case_name, candidate, check_func):
    import inspect
    import textwrap

    total = 0
    passed = 0
    failed = 0
    errors = []

    # Get source lines
    src_lines, _ = inspect.getsourcelines(check_func)
    body = textwrap.dedent(''.join(src_lines[1:]))

    lines = body.splitlines()
    blocks = []
    cur = []
    for line in lines:
        if line.strip().startswith("assert"):
            if cur:
                blocks.append('\n'.join(cur))
            cur = [line]
        elif cur:
            cur.append(line)
    if cur:
        blocks.append('\n'.join(cur))

    local_vars = {"candidate": candidate}
    for i, code in enumerate(blocks, 1):
        total += 1
        try:
            exec(code, globals(), local_vars)
            passed += 1
        except AssertionError:
            failed += 1
            errors.append(f"Test case {i} failed:\n{code}")
        except Exception as e:
            failed += 1
            errors.append(f"Test case {i} error: {e}\n{code}")

    print(f"Case {case_name}: {passed}/{total} passed")
    if failed > 0:
        for err in errors:
            print(f"  - {err}")
    return passed, total

# --- HumanEval/0 ---
def has_close_elements(numbers: List[float], threshold: float) -> bool:
    numbers.sort()
    for i in range(len(numbers) - 1):
        if numbers[i + 1] - numbers[i] < threshold:
            return True
    return False

def check_0(candidate):
    assert candidate([1.0, 2.0, 3.9, 4.0, 5.0, 2.2], 0.3) == True
    assert candidate([1.0, 2.0, 3.9, 4.0, 5.0, 2.2], 0.05) == False
    assert candidate([1.0, 2.0, 5.9, 4.0, 5.0], 0.95) == True
    assert candidate([1.0, 2.0, 5.9, 4.0, 5.0], 0.8) == False
    assert candidate([1.0, 2.0, 3.0, 4.0, 5.0, 2.0], 0.1) == True
    assert candidate([1.1, 2.2, 3.1, 4.1, 5.1], 1.0) == True
    assert candidate([1.1, 2.2, 3.1, 4.1, 5.1], 0.5) == False

# --- HumanEval/1 ---
def separate_paren_groups(paren_string: str) -> List[str]:
    result = []
    current_group = []
    depth = 0

    for char in paren_string.replace(" ", ""):
        if char == '(':
            depth += 1
            current_group.append(char)
        elif char == ')':
            depth -= 1
            current_group.append(char)
            if depth == 0:
                result.append(''.join(current_group))
                current_group = []

    return result

def check_1(candidate):
    assert candidate('(()()) ((())) () ((())()())') == [
        '(()())', '((()))', '()', '((())()())'
    ]
    assert candidate('() (()) ((())) (((())))') == [
        '()', '(())', '((()))', '(((())))'
    ]
    assert candidate('(()(())((())))') == [
        '(()(())((())))'
    ]
    assert candidate('( ) (( )) (( )( ))') == ['()', '(())', '(()())']

# --- HumanEval/2 ---
def truncate_number(number: float) -> float:
    return number - int(number)

def check_2(candidate):
    assert candidate(3.5) == 0.5
    assert abs(candidate(1.33) - 0.33) < 1e-6
    assert abs(candidate(123.456) - 0.456) < 1e-6

# --- HumanEval/3 ---
def below_zero(operations: List[int]) -> bool:
    balance = 0
    for operation in operations:
        balance += operation
        if balance < 0:
            return True
    return False

def check_3(candidate):
    assert candidate([]) == False
    assert candidate([1, 2, -3, 1, 2, -3]) == False
    assert candidate([1, 2, -4, 5, 6]) == True
    assert candidate([1, -1, 2, -2, 5, -5, 4, -4]) == False
    assert candidate([1, -1, 2, -2, 5, -5, 4, -5]) == True
    assert candidate([1, -2, 2, -2, 5, -5, 4, -4]) == True

# --- HumanEval/4 ---
def mean_absolute_deviation(numbers: List[float]) -> float:
    mean = sum(numbers) / len(numbers)
    mad = sum(abs(num - mean) for num in numbers) / len(numbers)
    return mad

def check_4(candidate):
    assert abs(candidate([1.0, 2.0, 3.0]) - 2.0/3.0) < 1e-6
    assert abs(candidate([1.0, 2.0, 3.0, 4.0]) - 1.0) < 1e-6
    assert abs(candidate([1.0, 2.0, 3.0, 4.0, 5.0]) - 6.0/5.0) < 1e-6

# --- HumanEval/5 ---
def intersperse(numbers: List[int], delimeter: int) -> List[int]:
    if not numbers:
        return []
    result = [numbers[0]]
    for num in numbers[1:]:
        result.extend([delimeter, num])
    return result

def check_5(candidate):
    assert candidate([], 7) == []
    assert candidate([5, 6, 3, 2], 8) == [5, 8, 6, 8, 3, 8, 2]
    assert candidate([2, 2, 2], 2) == [2, 2, 2, 2, 2]

# --- HumanEval/6 ---
def parse_nested_parens(paren_string: str) -> List[int]:
    def max_nesting(s: str) -> int:
        depth = max_depth = 0
        for char in s:
            if char == '(':
                depth += 1
                max_depth = max(max_depth, depth)
            elif char == ')':
                depth -= 1
        return max_depth

    return [max_nesting(group) for group in paren_string.split()]

def check_6(candidate):
    assert candidate('(()()) ((())) () ((())()())') == [2, 3, 1, 3]
    assert candidate('() (()) ((())) (((())))') == [1, 2, 3, 4]
    assert candidate('(()(())((())))') == [4]

# --- HumanEval/7 ---
def filter_by_substring(strings: List[str], substring: str) -> List[str]:
    return [s for s in strings if substring in s]

def check_7(candidate):
    assert candidate([], 'john') == []
    assert candidate(['xxx', 'asd', 'xxy', 'john doe', 'xxxAAA', 'xxx'], 'xxx') == ['xxx', 'xxxAAA', 'xxx']
    assert candidate(['xxx', 'asd', 'aaaxxy', 'john doe', 'xxxAAA', 'xxx'], 'xx') == ['xxx', 'aaaxxy', 'xxxAAA', 'xxx']
    assert candidate(['grunt', 'trumpet', 'prune', 'gruesome'], 'run') == ['grunt', 'prune']

# --- HumanEval/8 ---
def sum_product(numbers: List[int]) -> Tuple[int, int]:
    return sum(numbers), reduce(lambda x, y: x * y, numbers, 1)

def check_8(candidate):
    assert candidate([]) == (0, 1)
    assert candidate([1, 1, 1]) == (3, 1)
    assert candidate([100, 0]) == (100, 0)
    assert candidate([3, 5, 7]) == (3 + 5 + 7, 3 * 5 * 7)
    assert candidate([10]) == (10, 10)

# --- HumanEval/9 ---
def rolling_max(numbers: List[int]) -> List[int]:
    if not numbers:
        return []

    result = []
    current_max = numbers[0]
    for num in numbers:
        current_max = max(current_max, num)
        result.append(current_max)
    return result

def check_9(candidate):
    assert candidate([]) == []
    assert candidate([1, 2, 3, 4]) == [1, 2, 3, 4]
    assert candidate([4, 3, 2, 1]) == [4, 4, 4, 4]
    assert candidate([3, 2, 3, 100, 3]) == [3, 3, 3, 100, 100]

# --- HumanEval/10 ---
def make_palindrome(string: str) -> str:
    for i in range(len(string)):
        if string[i:] == string[i:][::-1]:
            return string + string[:i][::-1]
    return string

def check_10(candidate):
    assert candidate('') == ''
    assert candidate('x') == 'x'
    assert candidate('xyz') == 'xyzyx'
    assert candidate('xyx') == 'xyx'
    assert candidate('jerry') == 'jerryrrej'

if __name__ == "__main__":
    cases = [
        ("HumanEval/0", has_close_elements, check_0),
        ("HumanEval/1", separate_paren_groups, check_1),
        ("HumanEval/2", truncate_number, check_2),
        ("HumanEval/3", below_zero, check_3),
        ("HumanEval/4", mean_absolute_deviation, check_4),
        ("HumanEval/5", intersperse, check_5),
        ("HumanEval/6", parse_nested_parens, check_6),
        ("HumanEval/7", filter_by_substring, check_7),
        ("HumanEval/8", sum_product, check_8),
        ("HumanEval/9", rolling_max, check_9),
        ("HumanEval/10", make_palindrome, check_10),
    ]

    total_passed = 0
    total_test = 0

    print("==== Test Results Per Case ====")
    for idx, (name, func, checkf) in enumerate(cases):
        passed, tests = run_case(name, func, checkf)
        total_passed += passed
        total_test += tests
    print("==== Summary ====")
    print(f"Total: {total_passed}/{total_test} test cases passed.")
