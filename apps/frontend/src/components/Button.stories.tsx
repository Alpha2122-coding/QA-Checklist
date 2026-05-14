import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'ghost']
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg']
    }
  }
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary action',
    variant: 'primary'
  }
};

export const Secondary: Story = {
  args: {
    children: 'Secondary action',
    variant: 'secondary'
  }
};

export const Danger: Story = {
  args: {
    children: 'Delete item',
    variant: 'danger'
  }
};

export const Ghost: Story = {
  args: {
    children: 'Dismiss',
    variant: 'ghost'
  }
};
