function createScatterplot() {
    const margin = { top: 50, right: 30, bottom: 100, left: 50 },
        width = 800 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#chart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip div if it doesn't exist
    const tooltip = d3.select("body").select(".tooltip").node() 
        ? d3.select("body").select(".tooltip") 
        : d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255, 255, 255, 0.9)")
            .style("padding", "8px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("opacity", 0);

    // load csv data
    d3.csv("data/export_error.csv").then(data => {
        // Parse data
        data.forEach((d, i) => {
            d.time = +d.time;
            d.error = +d.error;
            d.day = `Day ${Math.floor(d.time / 1440) + 1}`;
        });

        const maleData = data.filter(d => d.gender === "male");
        const femaleData = data.filter(d => d.gender === "female");

        // Define scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.time) / 1440])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.error), d3.max(data, d => d.error)])
            .range([height, 0]);

        // Create lines
        const line = d3.line()
            .x(d => xScale(d.time / 1440))
            .y(d => yScale(d.error))
            .curve(d3.curveMonotoneX);

        // Add male line
        svg.append("path")
            .datum(maleData)
            .attr("fill", "none")
            .attr("stroke", "#ADD8E6")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Add female line
        svg.append("path")
            .datum(femaleData)
            .attr("fill", "none")
            .attr("stroke", "#FFB6C1")
            .attr("stroke-width", 2)
            .attr("d", line);

        // Add axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(d3.max(data, d => d.time) / 1440)
            .tickFormat(d => `Day ${Math.floor(d) + 1}`);
            
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.8em")
            .attr("dy", "0.15em")
            .attr("transform", "rotate(-45)");

        svg.append("g")
            .call(d3.axisLeft(yScale));

        // Add axis labels
        svg.append("text")
            .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 50})`)
            .style("text-anchor", "middle")
            .text("Day");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Distance From Mean (C°)");

        // Add chart title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 0 - margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Temperature Deviation by Gender");

        // Add legend
        const legend = svg.append("g")
            .attr("transform", `translate(${width - 80}, 10)`);

        legend.append("rect")
            .attr("x", 4)
            .attr("y", 4)
            .attr('width', 10)
            .attr('height', 10)
            .attr("fill", "#add8e6");

        legend.append("text")
            .attr("x", 20)
            .attr("y", 14)
            .text("Male")
            .attr("fill", "black");

        legend.append("rect")
        .attr("x", 4)
        .attr("y", 24)
        .attr('width', 10)
        .attr('height', 10)
        .attr("fill", "#FFB6C1");

        legend.append("text")
            .attr("x", 20)
            .attr("y", 34)
            .text("Female")
            .attr("fill", "black");

        // Add focus line for tooltip
        const focusLine = svg.append("line")
            .attr("class", "hover-line")
            .attr("y1", 0)
            .attr("y2", height)
            .style("stroke", "#999")
            .style("stroke-width", 1)
            .style("stroke-dasharray", "5,5")
            .style("opacity", 0);

        // Add data points for better interaction
        const malePoints = svg.selectAll(".male-point")
            .data(maleData)
            .enter()
            .append("circle")
            .attr("class", "male-point")
            .attr("cx", d => xScale(d.time / 1440))
            .attr("cy", d => yScale(d.error))
            .attr("r", 3)
            .attr("fill", "#6ca6cd")
            .style("opacity", 0); // Hidden initially

        const femalePoints = svg.selectAll(".female-point")
            .data(femaleData)
            .enter()
            .append("circle")
            .attr("class", "female-point")
            .attr("cx", d => xScale(d.time / 1440))
            .attr("cy", d => yScale(d.error))
            .attr("r", 3)
            .attr("fill", "#FF657C")
            .style("opacity", 0); // Hidden initially

        // Create bisector for finding nearest data point
        const bisect = d3.bisector(d => d.time).left;

        // Overlay for mouse interaction
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .on("mousemove", function(event) {
                // Get mouse position
                const mouseX = d3.pointer(event, this)[0];
                const x0 = xScale.invert(mouseX) * 1440; // Convert back to time units
                
                // Find closest data points
                const i = bisect(data, x0, 1);
                if (i >= data.length) return; // Exit if beyond data range
                
                const d0 = data[i - 1];
                const d1 = data[i];
                if (!d0 || !d1) return; // Safety check
                
                const d = x0 - d0.time > d1.time - x0 ? d1 : d0;
                
                // Find corresponding male and female data points
                const malePoint = maleData.find(m => Math.abs(m.time - d.time) < 1);
                const femalePoint = femaleData.find(f => Math.abs(f.time - d.time) < 1);
                
                const maleValue = malePoint ? malePoint.error.toFixed(2) : "N/A";
                const femaleValue = femalePoint ? femalePoint.error.toFixed(2) : "N/A";
                
                // Update tooltip
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(`<strong>Day ${Math.floor(d.time / 1440) + 1}</strong><br>Male: ${maleValue}°C<br>Female: ${femaleValue}°C`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                
                // Update focus line
                focusLine.attr("x1", xScale(d.time / 1440))
                    .attr("x2", xScale(d.time / 1440))
                    .attr("y1", 0)
                    .attr("y2", height)
                    .style("opacity", 1);
                
                // Highlight closest points
                malePoints.style("opacity", m => Math.abs(m.time - d.time) < 1 ? 1 : 0);
                femalePoints.style("opacity", f => Math.abs(f.time - d.time) < 1 ? 1 : 0);
            })
            .on("mouseout", function() {
                // Hide tooltip and focus elements
                tooltip.transition().duration(500).style("opacity", 0);
                focusLine.style("opacity", 0);
                malePoints.style("opacity", 0);
                femalePoints.style("opacity", 0);
            });
    }).catch(error => {
        console.error("Error loading the CSV file:", error);
        d3.select("#chart2")
            .append("p")
            .style("color", "red")
            .text("Error loading data. Please check if the file 'data/export_error.csv' exists.");
    });
}
createScatterplot();
