// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// jsdom (Jest 27 via react-scripts) lacks these; react-router v7 needs them.
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
