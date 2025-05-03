import { PromptTemplate } from './PromptManager';

export const defaultTemplates: PromptTemplate[] = [
  {
    id: 'default-1',
    title: 'General Assistant',
    content: 'You are a helpful AI assistant. Please help me with my request.'
  },
  {
    id: 'default-2',
    title: 'Code Review',
    content: 'Please review the following code and provide feedback on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance considerations\n4. Security concerns\n\nCode:\n{code}'
  },
  {
    id: 'default-3',
    title: 'Bug Fixing',
    content: 'I\'m encountering an error in my code. Please help me identify and fix the issue.\n\nError message:\n{error}\n\nRelevant code:\n{code}'
  },
  {
    id: 'default-4',
    title: 'Documentation',
    content: 'Please help me document the following code:\n\n{code}\n\nPlease provide:\n1. A clear description of what the code does\n2. Function/class documentation\n3. Usage examples\n4. Important notes or caveats'
  },
  {
    id: 'default-5',
    title: 'Code Generation',
    content: 'Please help me generate code for the following task:\n\nTask description:\n{task}\n\nRequirements:\n1. Use {language} programming language\n2. Follow best practices\n3. Include comments for clarity\n4. Handle edge cases'
  },
  {
    id: 'default-6',
    title: 'Code Optimization',
    content: 'Please help me optimize the following code for better performance:\n\n{code}\n\nPlease provide:\n1. Performance analysis\n2. Optimization suggestions\n3. Optimized code\n4. Explanation of improvements'
  },
  {
    id: 'default-7',
    title: 'Learning Assistant',
    content: 'I\'m learning about {topic}. Please help me understand:\n1. Key concepts\n2. Common use cases\n3. Best practices\n4. Potential pitfalls\n\nPlease provide clear explanations and examples.'
  },
  {
    id: 'default-8',
    title: 'Debugging',
    content: 'I\'m having trouble debugging my code. Please help me:\n1. Identify the root cause\n2. Suggest debugging steps\n3. Provide potential solutions\n\nError details:\n{error}\n\nCode context:\n{code}'
  },
  {
    id: 'default-9',
    title: 'Content Summarization',
    content: 'Please summarize the following content:\n\n{content}\n\nPlease provide:\n1. A concise overview of the main points\n2. Key takeaways\n3. Important details or statistics\n4. Any notable conclusions or recommendations\n\nKeep the summary clear and focused on the most important information.'
  }
]; 