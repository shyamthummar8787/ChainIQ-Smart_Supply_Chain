
class DocumentHighlighter {
  constructor() {
    this.highlights = document.querySelectorAll('.document-highlight');
    this.setupHighlights();
  }

  setupHighlights() {
    this.highlights.forEach(highlight => {
      highlight.addEventListener('mouseenter', (e) => this.showTooltip(e));
      highlight.addEventListener('mouseleave', (e) => this.hideTooltip(e));
    });
  }

  showTooltip(event) {
    const highlight = event.target;
    const tooltip = highlight.querySelector('.document-tooltip');
    if (!tooltip) return;

    const rect = highlight.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    tooltip.classList.remove('top', 'bottom');
    if (spaceBelow >= 100 || spaceBelow > spaceAbove) {
      tooltip.classList.add('bottom');
      tooltip.style.top = '100%';
      tooltip.style.bottom = 'auto';
    } else {
      tooltip.classList.add('top');
      tooltip.style.bottom = '100%';
      tooltip.style.top = 'auto';
    }

    tooltip.classList.add('active');
  }

  hideTooltip(event) {
    const tooltip = event.target.querySelector('.document-tooltip');
    if (tooltip) {
      tooltip.classList.remove('active');
    }
  }
}

// Initialize tooltips when document is ready
document.addEventListener('DOMContentLoaded', () => {
  new DocumentHighlighter();
});
