export const site = {
  name: 'Mingyang Sun',
  role: 'Research scientist / Engineer',
  introduction: [
    'I’m Mingyang Sun, a research scientist and engineer at Luma AI working on robot learning and embodied intelligence. I’m interested in how machines connect perception, language, and action to learn from and interact with the physical world.',
    'My current research spans vision-language-action models, diffusion policies, and dexterous manipulation. I work across model post-training, reinforcement learning, and simulation to bring learned behavior closer to real-world deployment. My background in design and spatial systems shapes how I approach this work: connecting data, models, and interaction through hands-on experimentation.',
  ],
  researchInterests: [
    {
      title: 'Embodied AI & Robot Learning',
      description: 'Vision-language-action models, visuomotor learning, and robotic manipulation.',
    },
    {
      title: 'Post-Training & Reinforcement Learning',
      description: 'Adapting policies through demonstrations, rewards, and interaction with their environment.',
    },
    {
      title: 'World Models & Spatial Intelligence',
      description: 'Generative video and 3D models for understanding and predicting physical environments.',
    },
    {
      title: 'Simulation & Sim-to-Real',
      description: 'Physics fidelity, synthetic data, and transferring learning from simulation to the physical world.',
    },
    {
      title: 'Evaluation & Scalable ML Systems',
      description: 'Rigorous benchmarks, failure analysis, and reproducible infrastructure for research.',
    },
  ],
  email: 'myangsun@outlook.com',
  linkedin: 'https://www.linkedin.com/in/myangsun/',
  instagram: 'https://www.instagram.com/mingyangsk/',
  description: 'Mingyang Sun — research scientist and engineer at Luma AI, working on VLA post-training, diffusion policies, dexterous manipulation, and sim-to-real robot learning.',
};

export function url(path = '') {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
