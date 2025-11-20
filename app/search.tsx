import React from 'react';
import SearchModal from './search-modal';

export default function Search() {
  // Top-level search route (outside of the tabs layout)
  // Rendering the same `SearchModal` here prevents the bottom tab bar from showing.
  return <SearchModal />;
}
