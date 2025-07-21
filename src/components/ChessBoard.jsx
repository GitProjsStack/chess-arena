import React, { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { socket } from '../socket';
import '../ChessBoard.css';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const pieceUnicode = (piece) => {
    if (!piece) return '';
    const codes = {
        p: { w: '♙', b: '♟' },
        r: { w: '♖', b: '♜' },
        n: { w: '♘', b: '♞' },
        b: { w: '♗', b: '♝' },
        q: { w: '♕', b: '♛' },
        k: { w: '♔', b: '♚' },
    };
    return codes[piece.type][piece.color];
};

function ChessBoard() {
    const [fen, setFen] = useState('');
    const [game] = useState(new Chess());
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [turn, setTurn] = useState('w');
    const [promotion, setPromotion] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [resultMsg, setResultMsg] = useState('');

    useEffect(() => {
        socket.emit('joinGame', 'room1');

        socket.on('gameState', (fen) => {
            game.load(fen);
            setFen(fen);
            setSelectedSquare(null);
            setTurn(game.turn());
            setPromotion(null);

            if (game.isCheckmate()) {
                setResultMsg(`Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins`);
                endGame();
            } else if (game.isStalemate()) {
                setResultMsg('Stalemate! Draw game.');
                endGame();
            } else {
                setGameOver(false);
                setResultMsg('');
            }
        });

        socket.on('resetGame', (fen) => {
            game.load(fen);
            setFen(fen);
            setSelectedSquare(null);
            setTurn(game.turn());
            setPromotion(null);
            setGameOver(false);
            setResultMsg('');
        });

        socket.on('invalidMove', (msg) => {
            setErrorMsg(msg);
            setTimeout(() => setErrorMsg(''), 3000);
        });

        return () => {
            socket.off('gameState');
            socket.off('resetGame');
            socket.off('invalidMove');
        };
    }, [game]);

    const endGame = () => {
        setTimeout(() => setGameOver(true), 2000);
    };

    const isPawnPromotion = (from, to) => {
        const piece = game.get(from);
        if (!piece || piece.type !== 'p') return false;
        const rank = to[1];
        return (piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1');
    };

    const sendMove = (from, to, promotionPiece = null) => {
        socket.emit('makeMove', { roomID: 'room1', from, to, promotion: promotionPiece });
    };

    const onSquareClick = (file, rank) => {
        if (promotion || gameOver) return;
        const square = file + rank;

        if (!selectedSquare) {
            setSelectedSquare(square);
        } else {
            if (isPawnPromotion(selectedSquare, square)) {
                setPromotion({ from: selectedSquare, to: square });
            } else {
                sendMove(selectedSquare, square);
            }
            setSelectedSquare(null);
        }
    };

    const onPromotionChoice = (piece) => {
        sendMove(promotion.from, promotion.to, piece);
        setPromotion(null);
    };

    const resetGame = () => {
        socket.emit('resetGame', 'room1'); // Server will reset and emit fresh FEN
    };

    if (gameOver) {
        return (
            <div className="game-over-container">
                <h2>{resultMsg}</h2>
                <button className="play-again-button" onClick={resetGame}>
                    Play Again
                </button>
            </div>
        );
    }

    const statusMsg = turn === 'w' ? 'White to move' : 'Black to move';

    return (
        <div className="chessboard-container">
            <div className="error-message">{errorMsg || '\u00A0'}</div>

            <div className="board-grid">
                {game.board().flat().map((square, idx) => {
                    const row = 7 - Math.floor(idx / 8);
                    const col = idx % 8;
                    const piece = pieceUnicode(square);
                    const squareName = files[col] + (row + 1);
                    const isSelected = selectedSquare === squareName;

                    const squareClass = (row + col) % 2 === 0 ? 'dark-square' : 'light-square';
                    const selectedClass = isSelected ? 'selected-square' : '';
                    const pieceColorClass = square && square.color === 'b' ? 'black-piece' : 'white-piece';

                    return (
                        <div
                            key={idx}
                            className={`board-square ${squareClass} ${selectedClass} ${pieceColorClass}`}
                            onClick={() => onSquareClick(files[col], row + 1)}
                            style={{ cursor: promotion ? 'default' : 'pointer' }}
                        >
                            {piece}
                        </div>
                    );
                })}
            </div>

            <div className="status-message">{statusMsg}</div>

            {promotion && (
                <div className="promotion-modal">
                    {['q', 'r', 'b', 'n'].map((p) => (
                        <div
                            key={p}
                            onClick={() => onPromotionChoice(p)}
                            className="promotion-choice"
                            title={{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[p]}
                        >
                            {pieceUnicode({ type: p, color: turn })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ChessBoard;
