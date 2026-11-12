import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Badge } from './Badge'
import { Button } from './Button'
import { Input } from './Input'
import { EmptyState, ErrorState } from './States'

describe('Button', () => {
  it('calls onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('defaults to type="button" so it never submits forms by accident', () => {
    render(<Button>Cancel</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('is disabled and busy while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Input', () => {
  it('associates the label with the field', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('announces errors through aria-invalid and aria-describedby', () => {
    render(<Input label="Email" error="Email is required." />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Email is required.')
  })

  it('lets users reveal and hide a password', async () => {
    render(<Input label="Password" type="password" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})

describe('States and Badge', () => {
  it('renders an empty state with its action', () => {
    render(
      <EmptyState title="No tasks yet" description="Create one" action={<button>Add</button>} />,
    )
    expect(screen.getByRole('heading', { name: 'No tasks yet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('renders an error state as an alert with retry', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Network down" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Network down')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders badge content', () => {
    render(<Badge tone="sage">Private</Badge>)
    expect(screen.getByText('Private')).toBeInTheDocument()
  })
})
