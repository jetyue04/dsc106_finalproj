let data;
let svg;
let tooltip;

async function loadData(){
    data = await d3.csv('data/cum_err.csv', (row) => ({
        ...row
    }));
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createPlot();
});

function createPlot(){ 
    const margin = { top: 50, right: 30, bottom: 100, left: 50 },
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

    svg = d3.select("#chart3")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // load csv data
    (data => {
        data.forEach((d, i) => {
            d.day = `Day ${Math.floor(d.time / 1440) + 1}`;
            d.cum_err = d.cum_err / 1000;
        });
    })

    const maleData = data.filter(d => d.gender === "male");
    const femaleData = data.filter(d => d.gender === "female");

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.time) / 1440])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.cum_err), d3.max(data, d => d.cum_err)])
        .range([height, 0]);

    // Create div for tooltip
    tooltip = d3.select("#chart3")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "3px")
        .style("padding", "8px")
        .style("pointer-events", "none");

    // Create the vertical line for hovering
    const verticalLine = svg.append("line")
        .attr("class", "hover-line")
        .attr("y1", 0)
        .attr("y2", height)
        .style("stroke", "#999")
        .style("stroke-width", 1)
        .style("stroke-dasharray", "5,5")
        .style("opacity", 0);

    // line
    const line = d3.line()
        .x(d => xScale(d.time / 1440))
        .y(d => yScale(d.cum_err));     

    svg.append("path")
        .datum(maleData)
        .attr("fill", "none")
        .attr("stroke", "lightblue")
        .attr("stroke-width", 2)
        .attr("d", line);

    svg.append("path")
        .datum(femaleData)
        .attr("fill", "none")
        .attr("stroke", "lightpink")
        .attr("stroke-width", 2)
        .attr("d", line);

    // axes
    svg.append("g")
        .style('stroke-width', 2)
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(d3.max(data, d => d.time) / 1440).tickFormat(d => `Day ${d + 1}`))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");

    svg.append("g")
        .style('stroke-width', 2)
        .call(d3.axisLeft(yScale).tickFormat(d => `${d / 1000}k`));

    // x-axis
    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 50})`)
        .style("text-anchor", "middle")
        .text("Day")
        .style("stroke-width", 5);

    // y-axis
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 1 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Cummulative Distance From Mean(C°)");

    // Add invisible overlay for mouse tracking
    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function() {
            verticalLine.style("opacity", 1);
            tooltip.style("opacity", 1);
        })
        .on("mouseout", function() {
            verticalLine.style("opacity", 0);
            tooltip.style("opacity", 0);
        })
        .on("mousemove", mousemove);

    // Legend
    svg.append("circle").attr("cx", width - 120).attr("cy", 20).attr("r", 6).style("fill", "lightblue");
    svg.append("text").attr("x", width - 100).attr("y", 20).text("Male").style("font-size", "15px").attr("alignment-baseline", "middle");
    svg.append("circle").attr("cx", width - 120).attr("cy", 50).attr("r", 6).style("fill", "lightpink");
    svg.append("text").attr("x", width - 100).attr("y", 50).text("Female").style("font-size", "15px").attr("alignment-baseline", "middle");

    function mousemove(event) {
        const mouseX = d3.pointer(event)[0];
        const invertedX = xScale.invert(mouseX);
        const dayValue = invertedX * 1440; // Convert back to minutes
        
        // Update the position of the vertical line
        verticalLine.attr("x1", mouseX).attr("x2", mouseX);
        
        // Find the closest data points for male and female data
        const bisectDate = d3.bisector(d => d.time).left;
        const maleIndex = bisectDate(maleData, dayValue);
        const femaleIndex = bisectDate(femaleData, dayValue);
        
        // Get the nearest male and female data points
        const maleDataPoint = maleData[maleIndex] || maleData[maleIndex - 1];
        const femaleDataPoint = femaleData[femaleIndex] || femaleData[femaleIndex - 1];
        
        if (maleDataPoint && femaleDataPoint) {
            const day = Math.floor(maleDataPoint.time / 1440) + 1;
            
            // Update tooltip content and position
            tooltip.html(`<strong>Day ${day}</strong><br>` +
                        `Cummulative Male Distance From Mean: ${parseFloat(maleDataPoint.cum_err).toFixed(2)} C°<br>` +
                        `Cummulative Female Distance From Mean: ${parseFloat(femaleDataPoint.cum_err).toFixed(2)} C°`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
        }
    }
}