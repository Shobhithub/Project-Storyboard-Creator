import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Welcome, AuthPage } from './Auth';

describe('public onboarding screens',()=>{
 it('introduces Vizzy Studio and routes the creator to account creation',()=>{
  render(<MemoryRouter><Welcome/></MemoryRouter>);
  expect(screen.getByRole('heading',{name:/make a world/i})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/create your studio/i})).toHaveAttribute('href','/register');
 });
 it('renders accessible sign-in fields and password visibility control',()=>{
  render(<MemoryRouter initialEntries={['/login']}><AuthPage onSuccess={()=>{}}/></MemoryRouter>);
  expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type','email');
  expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type','password');
  expect(screen.getByRole('button',{name:/show password/i})).toBeInTheDocument();
 });
});
