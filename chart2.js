const margin = { top: 50, right: 30, bottom: 100, left: 50 },
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

const svg = d3.select("#chart2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// load csv data
d3.csv("data/export_error.csv").then(data => {
    data.forEach((d, i) => {
        d.time = +d.time;
        d.error = +d.error;
        d.day = `Day ${Math.floor(d.time / 1440) + 1}`;
    });

    const maleData = data.filter(d => d.gender === "male");
    const femaleData = data.filter(d => d.gender === "female");

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.time) / 1440])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.error), d3.max(data, d => d.error)])
        .range([height, 0]);

    // line
    const line = d3.line()
        .x(d => xScale(d.time / 1440))
        .y(d => yScale(d.error));

    svg.append("path")
        .datum(maleData)
        .attr("fill", "none")
        .attr("stroke", "#4aa1ed")
        .attr("stroke-width", 2)
        .attr("d", line);

    svg.append("path")
        .datum(femaleData)
        .attr("fill", "none")
        .attr("stroke", "#e35252")
        .attr("stroke-width", 2)
        .attr("d", line);

    // axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(d3.max(data, d => d.time) / 1440).tickFormat(d => `Day ${d + 1}`))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");

    svg.append("g")
        .call(d3.axisLeft(yScale));

    // x-axis
    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 50})`)
        .style("text-anchor", "middle")
        .text("Day");

    // y-axis
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Distance From Mean (C°)");

    // legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 80}, 10)`); 

    legend.append("circle")
        .attr("cx", 10)
        .attr("cy", 10)
        .attr("r", 6)
        .attr("fill", "#4aa1ed");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 14)
        .text("Male")
        .attr("fill", "black");

    legend.append("circle")
        .attr("cx", 10)
        .attr("cy", 30)
        .attr("r", 6)
        .attr("fill", "#e35252");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 34)
        .text("Female")
        .attr("fill", "black");

})
