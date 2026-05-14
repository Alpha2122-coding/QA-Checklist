export const parameters = {
  actions: { argTypesRegex: '^on.*' },
  controls: { expanded: true },
  backgrounds: {
    default: 'dark',
    values: [
      { name: 'dark', value: '#020617' },
      { name: 'light', value: '#f8fafc' }
    ]
  },
  options: {
    storySort: {
      order: ['Components', 'Pages']
    }
  }
};
