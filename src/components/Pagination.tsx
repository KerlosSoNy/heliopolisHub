import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    startIndex: number;
    endIndex: number;
    itemsPerPage: number;
    onNext: () => void;
    onPrev: () => void;
    onGoToPage: (page: number) => void;
    onItemsPerPageChange: (n: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    itemsPerPage,
    onNext,
    onPrev,
    onGoToPage,
    onItemsPerPageChange,
}) => {
    // Generate visible page numbers (show max 5 around current)
    const getPageNumbers = (): (number | '...')[] => {
        const pages: (number | '...')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            if (start > 2) pages.push('...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className="pagination-container">
            {/* Info & Per Page Selector */}
            <div className="pagination-info">
                <span>
                    Showing <strong>{startIndex}</strong>–<strong>{endIndex}</strong> of{' '}
                    <strong>{totalItems}</strong>
                </span>
                <select
                    title="Items per page"
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="pagination-select"
                >
                    {[5, 10, 15, 20, 50].map((n) => (
                        <option key={n} value={n}>
                            {n} / page
                        </option>
                    ))}
                </select>
            </div>

            {/* Page Buttons */}
            <div className="pagination-buttons">
                <button
                    className="pagination-btn"
                    onClick={() => onGoToPage(1)}
                    disabled={currentPage === 1}
                    title="First page"
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    className="pagination-btn"
                    onClick={onPrev}
                    disabled={currentPage === 1}
                    title="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((page, i) =>
                    page === '...' ? (
                        <span key={`dots-${i}`} className="pagination-dots">
                            …
                        </span>
                    ) : (
                        <button
                            key={page}
                            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                            onClick={() => onGoToPage(page)}
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    className="pagination-btn"
                    onClick={onNext}
                    disabled={currentPage === totalPages}
                    title="Next page"
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    className="pagination-btn"
                    onClick={() => onGoToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last page"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;