const player = {
    markers: ['x', 'o'],
    index: 0,

    get marker() {
        return this.markers[this.index];
    },

    next_player() {
        if (++this.index >= this.markers.length)
            this.index = 0;
    }
};

const board = {
    starting_layout: [[' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
                      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
                      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
                      [' ', ' ', ' ', 'O', 'X', ' ', ' ', ' '],
                      [' ', ' ', ' ', 'X', 'O', ' ', ' ', ' '],
                      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
                      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
                      [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']],
    layout: undefined,

    async new_game() {
        // Maak een deep copy van starting_layout door het eerst om te zetten naar een json string en deze erna weer te parsen
        this.layout = JSON.parse(JSON.stringify(this.starting_layout));
        player.index = -1;
        this.draw();
        document.getElementById('board_wrapper').dataset.winner = "";
        timer.reset();
        setTimeout(this.continue_game, 500);
    },

    draw_init() {
        document.getElementById('board_container').innerHTML = this.html;
    },

    draw() {
        if (document.getElementById('board_container').innerHTML === '')
            this.draw_init();

        for (let cell of [...document.querySelectorAll('#board_container td')]) {
            cell.classList.remove('x', 'o', 'opt');

            let cellValue = this.layout[cell.parentNode.rowIndex][cell.cellIndex]
            if (cellValue !== ' ') {
                if (is_lower_case(cellValue))
                    cell.classList.add('opt');
                cell.classList.add(cellValue.toLowerCase());
            }
        }

        this.update_scores();
    },

    get html() {
        /*
         * Manier van speelbord in html weergeven gebaseerd op oefenzitting javascript en OXO voorbeeld
         * https://github.com/informaticawerktuigen/oefenzitting-javascript/blob/master/hoorcollege/ex7/code.js#L14-L25
         */
        let html = '<table>';
        for (let row of this.layout) {
            html += '<tr>';
            for (let cell of row)
                html += `<td class="${cell.toLowerCase()} ${cell !== ' ' && is_lower_case(cell) ? 'opt': ''}" onclick="click_handler(this)"></td>`;
            html += '</tr>';
        }
        return html + '</table>';
    },

    clear_options() {
        for (let i = 0; i < this.layout.length; i++)
            for (let j = 0; j < this.layout.length; j++)
                if (is_lower_case(this.layout[i][j]))
                    this.layout[i][j] = ' ';
    },

    mark_options(marker) {
        for (let i = 0; i < this.layout.length; i++)
            for (let j = 0; j < this.layout[i].length; j++)
                if (this.check_spot(marker, i, j))
                    this.layout[i][j] = marker.toLowerCase();
    },

    check_spot(marker, row, col) {
        if (this.layout[row][col] !== ' ') return false;

        for (let i = -1; i <= 1; i++)
            for (let j = -1; j <= 1; j++)
                if (this.check_direction(marker, row, col, i, j))
                    return true;
        return false;
    },

    check_direction(marker, row, col, d_row, d_col)  {
        for (let i = 1; this.is_in_bounds(i * d_row + row, i * d_col + col); i++) {
            let value = this.layout[row + i * d_row][col + i * d_col];
            if (value === ' ' || is_lower_case(value))
                return false;

            if (value.toLowerCase() === marker.toLowerCase())
                return i !== 1;
        }

        return false;
    },

    color_from_spot(marker, row, col) {
        let toBeColored = [{row: row, col: col}];
        for (let i = -1; i <= 1; i++)
            for (let j = -1; j <= 1; j++)
                toBeColored.push(this.color_direction(marker, row, col, i, j));

        for (let pos of toBeColored.flat().filter(p => p !== undefined))
            this.layout[pos.row][pos.col] = marker.toUpperCase();
    },

    color_direction(marker, row, col, d_row, d_col) {
        let toBeColored = [];
        for (let i = 1; this.is_in_bounds(i * d_row + row, i * d_col + col); i++) {
            let value = this.layout[row + i * d_row][col + i * d_col];
            if (value === ' ')
                return [];

            if (value.toLowerCase() === marker.toLowerCase())
                return toBeColored;

            toBeColored.push({row: row + i * d_row, col: col + i * d_col});
        }
    },

    next_player() {
        player.next_player();
        this.mark_options(player.marker);

        return this.has_options();
    },

    async continue_game() {
        if(!board.has_options()) {
            if (!board.next_player()) {
                let skipped_player = player.marker;
                if (!board.next_player())
                    board.show_winner();
                else
                    await board.show_turn_skipped(skipped_player);
            }

            board.draw();
        }
    },

    is_in_bounds(row, col) {
        return row >= 0 && row < this.layout.length
            && col >= 0 && col < this.layout[row].length;
    },

    has_options() {
        for (let i = 0; i < this.layout.length; i++)
            for (let j = 0; j < this.layout[i].length; j++)
                if (this.layout[i][j] !== ' ' && is_lower_case(this.layout[i][j]))
                    return true;
        return false;
    },

    count_marker(marker) {
        return this.layout.flat()
            .reduce((count, pos) => pos === marker
                .toUpperCase() ? count + 1 : count, 0);
    },

    update_scores() {
        for (let score of this.scores)
            document.querySelector(`.score.${score.marker}`).innerHTML = score.score;
    },

    show_winner() {
        timer.pause();

        let winner = this.winner;
        if (winner.length === 1)
            document.getElementById('board_wrapper').dataset.winner = winner[0];
        else
            document.getElementById('board_wrapper').dataset.winner = "draw";
    },

    async show_turn_skipped(marker) {
        document.getElementById('board_wrapper').dataset.skipped = marker;
        return new Promise(r => setTimeout(() => {
            document.getElementById('board_wrapper').dataset.skipped = "";
            r();
        }, 2000));
    },

    get scores() {
        return player.markers
            .map(marker => {
                return {marker: marker, score: this.count_marker(marker)};
            });
    },

    get winner() {
        let scores = this.scores.sort((a, b) => b.score - a.score);
        return  scores.filter(score => score.score === scores[0].score).map(score => score.marker);
    },
}

const timer = {
    seconds: 0,
    interval: undefined,

    get display_string() {
        let sec = this.seconds % 60;
        let min = (this.seconds - sec) / 60;

        return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
    },

    get html() {
        return `<td>${[...this.display_string].join('</td><td>')}</td>`;
    },

    start() {
        if (this.interval === undefined) {
            this.interval = setInterval(() => {
                this.seconds++;
                this.draw();
            }, 1000);
        }
    },

    pause() {
        clearInterval(this.interval);
        this.interval = undefined;
    },

    reset() {
        this.pause();
        this.seconds = 0;
        this.draw();
    },

    draw() {
        document.getElementById('timer_row').innerHTML = this.html;
    }
}

function is_lower_case(str) {
    return str === str.toLowerCase();
}

async function click_handler(cell) {
    let row = cell.parentNode.rowIndex;
    let col = cell.cellIndex;

    if (board.layout[row][col] === player.marker.toLowerCase()) {
        timer.start();
        board.clear_options();
        board.color_from_spot(player.marker, row, col);
        board.draw();

        setTimeout(board.continue_game, 500);
    }
}

window.onload = async () => {
    await board.new_game();
}
