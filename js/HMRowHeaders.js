function HMRowHeaders(hmBr, width, height, rowHeaders, rowHeaderTitles) {
    this.browser = hmBr;
    this.width = width;
    this.height = height;
    this.rowHeaders = rowHeaders;
    this.filteredRowHeaders = rowHeaders;
    this.rowHeaderTitles = rowHeaderTitles;
    this.scrollY = 0;
    this.currSearchIndex = -1;
    this.highlightedSearchIndices = [];
    this.filteredIndices = [];
    this.headerWidths = Array.isArray(rowHeaders[0])? Array.apply(null, Array(rowHeaders[0].length)).map(Number.prototype.valueOf,0) : [];
    this.approxHeaderHeights = this.browser.settings.rowFontSizePt * 1.5;
}

HMRowHeaders.prototype.init = function() {
    var hmRH = this;
    this.rowHeaderCanv = createCanvas('hmRowHeadCanvas', 0, this.height, 'position: absolute; left: 0');
    this.rowHeaderTitleCanv = createCanvas('hmRowHeadTitleCanvas', 0, this.height, 'position: absolute; left: 0, top: 0');
    this.highlightCanv = createCanvas('hmRowHeadHighlightCanvas', 0, this.height, 'position: absolute; left: 0');
    this.searchHighlightCanv = createCanvas('hmRowHeadSearchHighlightCanvas', 0, this.height, 'position: absolute; left: 0');
    this.browser.parentDiv.appendChild(this.rowHeaderCanv);
    this.browser.parentDiv.appendChild(this.rowHeaderTitleCanv);
    this.browser.parentDiv.appendChild(this.highlightCanv);
    this.browser.parentDiv.appendChild(this.searchHighlightCanv);
    this.rowHeaderCtx = this.rowHeaderCanv.getContext("2d");
    this.rowHeaderTitleCtx = this.rowHeaderTitleCanv.getContext("2d");
    this.rowHeaderCtx.font = this.browser.settings.rowFontSizePt + 'pt ' + this.browser.settings.rowFontFamily;
    this.highlightCtx = this.highlightCanv.getContext("2d");
    this.searchHighlightCtx = this.searchHighlightCanv.getContext("2d");
    this.rowHeaderCtx.font = this.browser.settings.rowFontSizePt + 'pt ' + this.browser.settings.rowFontFamily;
    this.rowHeaderTitleCtx.font = 'bold ' + this.browser.settings.rowTitleFontSizePt + 'pt ' + this.browser.settings.rowTitleFontFamily;
    this.highlightCtx.strokeStyle = this.browser.settings.highlightCellColor;
    this.highlightCtx.lineWidth = this.browser.settings.highlightCellLineWidth;
    this.searchHighlightCtx.fillStyle = this.browser.settings.highlightSearchFill;
    this.searchHighlightCtx.globalAlpha = this.browser.settings.highlightSearchOpacity;
    this.width = this.getMaxWidth(this.rowHeaders, this.rowHeaderCtx);
    this.rowHeaderCanv.width = this.width;
    this.highlightCanv.width = this.width;
    this.searchHighlightCanv.width = this.width;
    this.searchHighlightCanv.onmousemove = function(e) {
        var evt = e || event;

        var ch = hmRH.browser.settings.cellHeight * hmRH.browser.zoom;
        var cw = hmRH.browser.settings.cellWidth * hmRH.browser.zoom;

        var i = Math.floor(((e.offsetY - hmRH.browser.hmTL.top) + hmRH.scrollY)/ch);
        var placementX = hmRH.browser.hmTL.left;
        var placementY = ((ch*i)-hmRH.scrollY) + hmRH.browser.hmTL.top + cw;

        hmRH.highlightHeader(i,0);
        hmRH.browser.heatmap.highlightRow(i);
        hmRH.browser.showRHTooltip(placementX, placementY, i);
        //HMHeat.highlightCell(evt.offsetX, evt.offsetY);
    };
    this.searchHighlightCanv.onmouseout = function(e) {
        hmRH.clearHighlights();
        hmRH.browser.heatmap.clearHighlights();
        hmRH.browser.hideTooltip();
        //HMHeat.highlightCtx.clearRect(0, 0, HMHeat.highlightCanv.width, HMHeat.highlightCanv.height);
        //HMHeat.browser.onMouseOut();
    };
    this.searchHighlightCanv.onclick = function(e) {
        var evt = e || event;
        var ch = hmRH.browser.settings.cellHeight * hmRH.browser.zoom;
        var i = Math.floor(((e.offsetY - hmRH.browser.hmTL.top) + hmRH.scrollY)/ch);
        hmRH.browser.settings.onRowHeadClick(i, hmRH.filteredRowHeaders[i], hmRH.browser.heatmap.filteredData[i]);
    };
};

HMRowHeaders.prototype.getMaxWidth = function(textMat, ctx) {
    var w = 0;
    for(var i = 0; i < textMat.length; ++i) {
        var colWidths = 0;
        if (Array.isArray(textMat[i])) {
            for(var j = 0; j < textMat[i].length; ++j) {
                if (this.browser.settings.hiddenRowHeaderInds[j]) continue;
                var curr = ctx.measureText(textMat[i][j]).width + (2*this.browser.settings.labelTextPadding);
                var header = (this.rowHeaderTitles[j]) ? this.rowHeaderTitleCtx.measureText(this.rowHeaderTitles[j]).width + (2*this.browser.settings.labelTextPadding) : 0;
                this.headerWidths[j] = Math.max(Math.max(curr, this.headerWidths[j]), header);
                colWidths += this.headerWidths[j];
            }
        } else {
            var curr = ctx.measureText(textMat[i]).width + (2*this.browser.settings.labelTextPadding);
            var header = (this.rowHeaderTitles[i]) ? this.rowHeaderTitleCtx.measureText(this.rowHeaderTitles[i]).width + (2*this.browser.settings.labelTextPadding) : 0;
            colWidths = Math.max(curr, header);
        }
        w = Math.max(colWidths, w);
    }

    return w;
};

HMRowHeaders.prototype.inView = function(i) {
    //var filteredIndex = this.filteredIndices.indexOf(i);
    //if (filteredIndex < 0) return false;

    var ch = this.browser.settings.cellHeight * this.browser.zoom;
    var elem = {top: ch*i, bot: ch*(i+1) };
    var view = {top: this.scrollY, bot: this.browser.heatmap.height + this.scrollY};
    return !( elem.bot < view.top || elem.top > view.bot );
};

HMRowHeaders.prototype.renderTitles = function(ctx) {
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + this.browser.settings.rowTitleFontSizePt + 'pt ' + this.browser.settings.rowTitleFontFamily;
    var currWidth = 0;
    for(var i = 0; i < this.rowHeaderTitles.length; ++i) {
        if (this.browser.settings.hiddenRowHeaderInds[i]) continue;
        ctx.fillText(this.rowHeaderTitles[i], (currWidth) + (this.headerWidths[i]/2), this.browser.hmTL.top);
        currWidth += this.headerWidths[i];
    }
};

HMRowHeaders.prototype.renderFull = function(width, height) {
    var ch = this.browser.settings.cellHeight;
    var fullCanv = createCanvas('hmRowHeadFullCanvas', width, height, '');
    var ctx = fullCanv.getContext("2d");

    if (this.approxHeaderHeights <= ch) {
        var currFont = ctx.font;
        this.renderTitles(ctx);
        ctx.font = currFont;
        ctx.textBaseline = 'middle';
        for(var i = 0; i < this.filteredRowHeaders.length; ++i) {
            if (Array.isArray(this.filteredRowHeaders[0])) {
                ctx.textAlign = 'center';
                var currWidth = 0;
                // Render the first col then loop through any remaining
                ctx.fillText(this.filteredRowHeaders[i][0], this.browser.settings.labelTextPadding + (this.headerWidths[0]/2), i*ch + (ch/2) + this.browser.hmTL.top);
                for(var j = 1; j < this.filteredRowHeaders[i].length; ++j) {
                    if (this.browser.settings.hiddenRowHeaderInds[j]) continue;

                    currWidth += this.headerWidths[j-1];
                    ctx.fillText(this.filteredRowHeaders[i][j], (currWidth) + (this.headerWidths[j]/2), i*ch + (ch/2) + this.browser.hmTL.top);
                }
            } else {
                ctx.fillText(this.filteredRowHeaders[i], this.browser.settings.labelTextPadding, i*ch + (ch/2) + this.browser.hmTL.top);
            }
        }
    }
    this.searchHighlightHeaders(ctx, this.highlightedSearchIndices, false, false, false);
    return fullCanv;
};

HMRowHeaders.prototype.render = function() {
    var ch = this.browser.settings.cellHeight * this.browser.zoom;

    if (this.approxHeaderHeights <= ch) {
        this.renderTitles(this.rowHeaderTitleCtx);
        this.rowHeaderCtx.textBaseline = 'middle';
        for(var i = 0; i < this.filteredRowHeaders.length; ++i) {
            if (!this.inView(i)) continue;

            if (Array.isArray(this.filteredRowHeaders[0])) {
                this.rowHeaderCtx.textAlign = 'center';
                var currWidth = 0;
                // Render the first col then loop through any remaining
                this.rowHeaderCtx.fillText(this.filteredRowHeaders[i][0], this.browser.settings.labelTextPadding + (this.headerWidths[0]/2), i*ch + (ch/2) + this.browser.hmTL.top - this.scrollY);
                for(var j = 1; j < this.filteredRowHeaders[i].length; ++j) {
                    if (this.browser.settings.hiddenRowHeaderInds[j]) continue;

                    currWidth += this.headerWidths[j-1];
                    this.rowHeaderCtx.fillText(this.filteredRowHeaders[i][j], (currWidth) + (this.headerWidths[j]/2), i*ch + (ch/2) + this.browser.hmTL.top - this.scrollY);
                }
            } else {
                this.rowHeaderCtx.fillText(this.filteredRowHeaders[i], this.browser.settings.labelTextPadding, i*ch + (ch/2) + this.browser.hmTL.top - this.scrollY);
            }
        }
    }
    this.searchHighlightHeaders(this.searchHighlightCtx, this.highlightedSearchIndices);
};

HMRowHeaders.prototype.highlightHeader = function(i, j) {
    var cw = this.browser.settings.cellWidth * this.browser.zoom;
    var ch = this.browser.settings.cellHeight * this.browser.zoom;

    this.highlightCtx.clearRect(0, 0, this.highlightCanv.width, this.highlightCanv.height);

    // Horizontal
    this.highlightCtx.beginPath();
    this.highlightCtx.moveTo(0, (ch*i) + this.browser.hmTL.top - this.scrollY);
    this.highlightCtx.lineTo(this.width, (ch*i) + this.browser.hmTL.top - this.scrollY);
    this.highlightCtx.stroke();

    this.highlightCtx.beginPath();
    this.highlightCtx.moveTo(0, (ch*(i+1)) + this.browser.hmTL.top - this.scrollY);
    this.highlightCtx.lineTo(this.width, (ch*(i+1)) + this.browser.hmTL.top - this.scrollY);
    this.highlightCtx.stroke();
};

HMRowHeaders.prototype.searchHighlightHeaders = function(ctx, indices, clear, zoom, scroll) {
    clear = clear != null ? clear : true;
    zoom = zoom != null ? zoom : true;
    scroll = scroll != null ? scroll : true;
    var cw = this.browser.settings.cellWidth * (zoom ? this.browser.zoom : 1);
    var ch = this.browser.settings.cellHeight * (zoom ? this.browser.zoom : 1);

    ctx.fillStyle = this.browser.settings.highlightSearchFill;
    ctx.globalAlpha = this.browser.settings.highlightSearchOpacity;

    this.highlightedSearchIndices = (indices) ? indices : [];

    if (clear) {
        ctx.clearRect(0, 0, this.searchHighlightCanv.width, this.searchHighlightCanv.height);
    }

    for (var i = 0; i < this.highlightedSearchIndices.length; ++i) {
        var idx = indices[i];
        ctx.fillRect(0, (ch*idx) + this.browser.hmTL.top - (scroll ? this.scrollY : 0), this.width, ch);
    }
};

HMRowHeaders.prototype.searchFilterHeaders = function(indices) {
    if (indices) {
        this.filteredIndices = indices;
        this.filteredRowHeaders = [];
        for (var i = 0; i < indices.length; ++i) {
            this.filteredRowHeaders.push(this.rowHeaders[indices[i]]);
        }
    } else {
        this.filteredIndices = [];
        this.filteredRowHeaders = this.rowHeaders;
    }
};

HMRowHeaders.prototype.searchNext = function() {
    if (!this.browser.needsVertScroll) return;

    var ch = this.browser.settings.cellHeight * this.browser.zoom;

    this.currSearchIndex = ((this.currSearchIndex + 1) % this.highlightedSearchIndices.length);
    this.scrollY = this.highlightedSearchIndices[this.currSearchIndex] * ch;
};

HMRowHeaders.prototype.searchPrev = function() {
    if (!this.browser.needsVertScroll) return;

    var ch = this.browser.settings.cellHeight * this.browser.zoom;

    this.currSearchIndex = (((this.currSearchIndex % this.highlightedSearchIndices.length) + this.highlightedSearchIndices.length - 1) % this.highlightedSearchIndices.length);
    this.scrollY = this.highlightedSearchIndices[this.currSearchIndex] * ch;
};

HMRowHeaders.prototype.setScrollY = function(scrollY) {
    this.scrollY = scrollY;
};

HMRowHeaders.prototype.clear = function() {
    this.rowHeaderCtx.clearRect(0, 0, this.rowHeaderCanv.width, this.rowHeaderCanv.height);
    this.rowHeaderTitleCtx.clearRect(0, 0, this.rowHeaderTitleCanv.width, this.rowHeaderTitleCanv.height);
    this.highlightCtx.clearRect(0, 0, this.highlightCanv.width, this.highlightCanv.height);
    this.searchHighlightCtx.clearRect(0, 0, this.searchHighlightCanv.width, this.searchHighlightCanv.height);
};

HMRowHeaders.prototype.clearSearchHighlights = function() {
    this.highlightedSearchIndices = [];
    this.highlightCtx.clearRect(0, 0, this.searchHighlightCanv.width, this.searchHighlightCanv.height);
};

HMRowHeaders.prototype.clearHighlights = function() {
    this.highlightCtx.clearRect(0, 0, this.highlightCanv.width, this.highlightCanv.height);
};

HMRowHeaders.prototype.redraw = function() {
    this.clear();
    this.render();
};

HMRowHeaders.prototype.setHeight = function(height) {
    this.height = height;
    this.rowHeaderCanv.height = height;
    this.rowHeaderTitleCanv.width = this.browser.hmTL.left;
    this.rowHeaderTitleCanv.height = this.browser.hmTL.top;
    this.highlightCanv.height = height;
    this.searchHighlightCanv.height = height;
    this.rowHeaderCtx.font = this.browser.settings.rowFontSizePt + 'pt ' + this.browser.settings.rowFontFamily;
    this.rowHeaderTitleCtx.font = 'bold ' + this.browser.settings.rowTitleFontSizePt + 'pt ' + this.browser.settings.rowTitleFontFamily;
    this.highlightCtx.strokeStyle = this.browser.settings.highlightCellColor;
    this.highlightCtx.lineWidth = this.browser.settings.highlightCellLineWidth;
    this.searchHighlightCtx.fillStyle = this.browser.settings.highlightSearchFill;
    this.searchHighlightCtx.globalAlpha = this.browser.settings.highlightSearchOpacity;
};

HMRowHeaders.prototype.onScrollX = function(scrollX) {
    this.highlightCtx.clearRect(0, 0, this.highlightCanv.width, this.highlightCanv.height);
};

HMRowHeaders.prototype.onScrollY = function(scrollY) {
    this.scrollY = scrollY;
    this.redraw();
};

HMRowHeaders.prototype.onHighlightCell = function(i, j) {
    this.highlightHeader(i,j);
};
