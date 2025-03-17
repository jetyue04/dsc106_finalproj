let data1, data2;
const margin = { top: 50, right: 40, bottom: 100, left: 60 };
const getChartWidth = (id) => {
    const container = document.querySelector(`.chart-box:has(#${id})`);
    const containerWidth = container ? container.clientWidth : window.innerWidth * 0.9;
    return containerWidth - margin.left - margin.right;
};
let width, height;
let svg1, svg2;
let tooltip1, tooltip2;
let focusLine1, focusLine2;
let malePoints1, femalePoints1, maleDot2, femaleDot2;

// Load data and create both plots
async function initializeCharts() {
    // Determine initial width based on container size
    width = getChartWidth("chart2");
    height = Math.min(500, window.innerHeight * 0.6) - margin.top - margin.bottom;
    
    // Load data for both charts
    try {
        const [errorData, cumulativeData] = await Promise.all([
            d3.csv("data/export_error.csv", d => {
                d.time = +d.time;
                d.error = +d.error;
                d.day = `Day ${Math.floor(d.time / 1440) + 1}`;
                return d;
            }),
            d3.csv("data/cum_err.csv")
        ]);
        
        data1 = errorData;
        data2 = cumulativeData;
        
        // Create both charts
        createScatterplot();
        createCumulativePlot();
        
        // Add synchronized event listeners
        addSynchronizedEventListeners();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function createScatterplot() {
    svg1 = d3.select("#chart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip div if it doesn't exist
    tooltip1 = d3.select("body").select(".tooltip1").node() 
        ? d3.select("body").select(".tooltip1") 
        : d3.select("body").append("div")
            .attr("class", "tooltip1")
            .style("position", "absolute")
            .style("background", "rgba(255, 255, 255, 0.9)")
            .style("padding", "8px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("opacity", 0);

    // Separate data by gender
    const maleData = data1.filter(d => d.gender === "male");
    const femaleData = data1.filter(d => d.gender === "female");

    // Define scales
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data1, d => d.time) / 1440])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data1, d => d.error), d3.max(data1, d => d.error)])
        .range([height, 0]);

    // Create lines
    const line = d3.line()
        .x(d => xScale(d.time / 1440))
        .y(d => yScale(d.error))
        .curve(d3.curveMonotoneX);

    // Add male line
    svg1.append("path")
        .datum(maleData)
        .attr("fill", "none")
        .attr("stroke", "#ADD8E6")
        .attr("stroke-width", 1)
        .attr("d", line);

    // Add female line
    svg1.append("path")
        .datum(femaleData)
        .attr("fill", "none")
        .attr("stroke", "#FFB6C1")
        .attr("stroke-width", 1)
        .attr("d", line);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(d3.max(data1, d => d.time) / 1440)
        .tickFormat(d => `Day ${Math.floor(d) + 1}`);
        
    svg1.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");

    svg1.append("g")
        .call(d3.axisLeft(yScale));

    // Add axis labels
    svg1.append("text")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 50})`)
        .style("text-anchor", "middle")
        .text("Day");

    svg1.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Distance From Mean (C°)");

    // Add legend
    const legend = svg1.append("g")
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
    focusLine1 = svg1.append("line")
        .attr("class", "hover-line")
        .attr("y1", 0)
        .attr("y2", height)
        .style("stroke", "#999")
        .style("stroke-width", 1)
        .style("stroke-dasharray", "5,5")
        .style("opacity", 0);

    // Add data points for better interaction
    malePoints1 = svg1.selectAll(".male-point")
        .data(maleData)
        .enter()
        .append("circle")
        .attr("class", "male-point")
        .attr("cx", d => xScale(d.time / 1440))
        .attr("cy", d => yScale(d.error))
        .attr("r", 3)
        .attr("fill", "#6ca6cd")
        .style("opacity", 0); // Hidden initially

    femalePoints1 = svg1.selectAll(".female-point")
        .data(femaleData)
        .enter()
        .append("circle")
        .attr("class", "female-point")
        .attr("cx", d => xScale(d.time / 1440))
        .attr("cy", d => yScale(d.error))
        .attr("r", 3)
        .attr("fill", "#FF657C")
        .style("opacity", 0); // Hidden initially

    // Store scales and data for later use in synchronized events
    svg1.xScale = xScale;
    svg1.yScale = yScale;
    svg1.maleData = maleData;
    svg1.femaleData = femaleData;
    svg1.bisect = d3.bisector(d => d.time).left;
}

function createCumulativePlot() {
    svg2 = d3.select("#chart3")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse data
    data2.forEach(d => {
        d.time = +d.time;
        d.cum_err = +d.cum_err;
    });
    
    const maleData = data2.filter(d => d.gender === "male");
    const femaleData = data2.filter(d => d.gender === "female");

    const xScale = d3.scaleLinear()
        .domain([0, 12])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([d3.min(data2, d => d.cum_err), 180000])
        .range([height, 0]);

    // Create tooltip div if it doesn't exist
    tooltip2 = d3.select("body").select(".tooltip2").node() 
        ? d3.select("body").select(".tooltip2") 
        : d3.select("body").append("div")
            .attr("class", "tooltip2")
            .style("position", "absolute")
            .style("background", "rgba(255, 255, 255, 0.9)")
            .style("padding", "8px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("opacity", 0);

    // Create the vertical line for hovering
    focusLine2 = svg2.append("line")
        .attr("class", "hover-line")
        .attr("y1", 0)
        .attr("y2", height)
        .style("stroke", "#999")
        .style("stroke-width", 1)
        .style("stroke-dasharray", "5,5")
        .style("opacity", 0);

    // Create containers for dynamic path segments
    const maleLineContainer = svg2.append("g").attr("class", "male-line-container");
    const femaleLineContainer = svg2.append("g").attr("class", "female-line-container");
    
    // Create full gray base lines
    const line = d3.line()
        .x(d => xScale(d.time / 1440))
        .y(d => yScale(d.cum_err));     

    maleLineContainer.append("path")
        .datum(maleData)
        .attr("class", "male-line-base")
        .attr("fill", "none")
        .attr("stroke", "#cccccc")  // Gray color for the base line
        .attr("stroke-width", 2)
        .attr("d", line);

    femaleLineContainer.append("path")
        .datum(femaleData)
        .attr("class", "female-line-base")
        .attr("fill", "none")
        .attr("stroke", "#cccccc")  // Gray color for the base line
        .attr("stroke-width", 2)
        .attr("d", line);
    
    // Add colored segments (these will be dynamically updated)
    maleLineContainer.append("path")
        .attr("class", "male-line-colored")
        .attr("fill", "none")
        .attr("stroke", "lightblue")
        .attr("stroke-width", 2);

    femaleLineContainer.append("path")
        .attr("class", "female-line-colored")
        .attr("fill", "none")
        .attr("stroke", "lightpink")
        .attr("stroke-width", 2);
        
    // Create dots for intersection points
    maleDot2 = svg2.append("circle")
        .attr("class", "intersection-dot")
        .attr("r", 4)
        .attr("fill", "#6ca6cd")
        .style("opacity", 0)
        .raise(); // Hidden initially
        
    femaleDot2 = svg2.append("circle")
        .attr("class", "intersection-dot")
        .attr("r", 4)
        .attr("fill", "#FF657C")
        .style("opacity", 0)
        .raise();

    // axes
    svg2.append("g")
        .style('stroke-width', 2)
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(12).tickFormat(d => `Day ${d + 1}`))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");

    svg2.append("g")
        .style('stroke-width', 2)
        .call(d3.axisLeft(yScale).tickFormat(d => `${d / 1000}k`));

    // x-axis
    svg2.append("text")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 50})`)
        .style("text-anchor", "middle")
        .text("Day")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    // y-axis
    svg2.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 1 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Cumulative Distance From Mean (C°)");

    // Legend
    const legend = svg2.append("g")
        .attr("transform", `translate(${width - 80}, 10)`);

    legend.append("rect")
        .attr("x", 4)
        .attr("y", 384)
        .attr('width', 10)
        .attr('height', 10)
        .attr("fill", "#add8e6");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 394)
        .text("Male")
        .attr("fill", "black");

    legend.append("rect")
        .attr("x", 4)
        .attr("y", 404)
        .attr('width', 10)
        .attr('height', 10)
        .attr("fill", "#FFB6C1");

    legend.append("text")
        .attr("x", 20)
        .attr("y", 414)
        .text("Female")
        .attr("fill", "black");
        
    // Store scales and data for later use in synchronized events
    svg2.xScale = xScale;
    svg2.yScale = yScale;
    svg2.maleData = maleData;
    svg2.femaleData = femaleData;
    svg2.bisect = d3.bisector(d => d.time).left;
    svg2.line = line;  // Store the line generator
}

function addSynchronizedEventListeners() {
    // Add invisible overlay for mouse tracking on first chart
    svg1.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function() {
            focusLine1.style("opacity", 1);
            focusLine2.style("opacity", 1);
            tooltip1.style("opacity", 0.9);
            // Only show tooltip1 when hovering over chart1
            tooltip2.style("opacity", 0);
        })
        .on("mouseout", function() {
            focusLine1.style("opacity", 0);
            focusLine2.style("opacity", 0);
            tooltip1.style("opacity", 0);
            tooltip2.style("opacity", 0);
            malePoints1.style("opacity", 0);
            femalePoints1.style("opacity", 0);
            maleDot2.style("opacity", 0);
            femaleDot2.style("opacity", 0);
            
            // Reset the colored line segments to empty paths
            svg2.select(".male-line-colored")
                .datum([])
                .attr("d", svg2.line);
                
            svg2.select(".female-line-colored")
                .datum([])
                .attr("d", svg2.line);
        })
        .on("mousemove", function(event) {
            handleMouseMove(event, 1); // Pass chart ID as parameter
        });
        
    // Add invisible overlay for mouse tracking on second chart
    svg2.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function() {
            focusLine1.style("opacity", 1);
            focusLine2.style("opacity", 1);
            // Only show tooltip2 when hovering over chart2
            tooltip1.style("opacity", 0);
            tooltip2.style("opacity", 0.9);
        })
        .on("mouseout", function() {
            focusLine1.style("opacity", 0);
            focusLine2.style("opacity", 0);
            tooltip1.style("opacity", 0);
            tooltip2.style("opacity", 0);
            malePoints1.style("opacity", 0);
            femalePoints1.style("opacity", 0);
            maleDot2.style("opacity", 0);
            femaleDot2.style("opacity", 0);
        })
        .on("mousemove", function(event) {
            handleMouseMove(event, 2); // Pass chart ID as parameter
        });
}

function handleMouseMove(event, chartId) {
    // Get x coordinate in data space for both charts
    const mouseX = d3.pointer(event)[0];
    
    // Calculate the corresponding day value for chart 1
    const dayValue1 = svg1.xScale.invert(mouseX);
    const timeValue1 = dayValue1 * 1440; // Convert days to minutes
    
    // Find the nearest data points in chart 1
    const maleIdx1 = svg1.bisect(svg1.maleData, timeValue1);
    const femaleIdx1 = svg1.bisect(svg1.femaleData, timeValue1);
    
    const malePoint1 = svg1.maleData[maleIdx1 < svg1.maleData.length ? maleIdx1 : svg1.maleData.length - 1];
    const femalePoint1 = svg1.femaleData[femaleIdx1 < svg1.femaleData.length ? femaleIdx1 : svg1.femaleData.length - 1];
    
    // Calculate the corresponding day value for chart 2
    const dayValue2 = svg2.xScale.invert(mouseX);
    const timeValue2 = dayValue2 * 1440; // Convert days to minutes
    
    // Find the nearest data points in chart 2
    const maleIdx2 = svg2.bisect(svg2.maleData, timeValue2);
    const femaleIdx2 = svg2.bisect(svg2.femaleData, timeValue2);
    
    const malePoint2 = svg2.maleData[maleIdx2 < svg2.maleData.length ? maleIdx2 : svg2.maleData.length - 1];
    const femalePoint2 = svg2.femaleData[femaleIdx2 < svg2.femaleData.length ? femaleIdx2 : svg2.femaleData.length - 1];
    
    // Update the position of the vertical lines
    focusLine1.attr("x1", mouseX).attr("x2", mouseX);
    focusLine2.attr("x1", mouseX).attr("x2", mouseX);
    
    // Update the visible data points on chart 1
    malePoints1.style("opacity", 0);
    femalePoints1.style("opacity", 0);
    
    // Find the closest male and female points to highlight
    const closestMalePoint1 = malePoints1.filter(d => d.time === malePoint1.time).style("opacity", 1);
    const closestFemalePoint1 = femalePoints1.filter(d => d.time === femalePoint1.time).style("opacity", 1);
    
    // Update the dots on chart 2
    maleDot2
        .attr("cx", svg2.xScale(malePoint2.time / 1440))
        .attr("cy", svg2.yScale(malePoint2.cum_err))
        .style("opacity", 1);
        
    femaleDot2
        .attr("cx", svg2.xScale(femalePoint2.time / 1440))
        .attr("cy", svg2.yScale(femalePoint2.cum_err))
        .style("opacity", 1);
    
    // Update the colored line segments on chart 2
    // Create subsets of data up to the current point
    const maleSubset = svg2.maleData.filter(d => d.time <= malePoint2.time);
    const femaleSubset = svg2.femaleData.filter(d => d.time <= femalePoint2.time);
    
    // Update the colored line segments
    svg2.select(".male-line-colored")
        .datum(maleSubset)
        .attr("d", svg2.line);
        
    svg2.select(".female-line-colored")
        .datum(femaleSubset)
        .attr("d", svg2.line);
    
    // Update only the relevant tooltip based on which chart is being hovered
    if (chartId === 1) {
        // First tooltip: Body Temperature Variability
        tooltip1
            .html(`<strong>Body Temperature Variability:</strong><br>` +
                `<span style="color:#6ca6cd">Male: ${malePoint1.error.toFixed(2)}°C</span><br>` +
                `<span style="color:#FF657C">Female: ${femalePoint1.error.toFixed(2)}°C</span>`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
    } else if (chartId === 2) {
        // Second tooltip: Cumulative Variability
        tooltip2
            .html(`<strong>Cumulative Variability:</strong><br>` +
                `<span style="color:#6ca6cd">Male: ${(malePoint2.cum_err / 1000).toFixed(1)}k°C</span><br>` +
                `<span style="color:#FF657C">Female: ${(femalePoint2.cum_err / 1000).toFixed(1)}k°C</span>`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
    }
}

// Initialize charts when document is loaded
document.addEventListener("DOMContentLoaded", initializeCharts);

window.addEventListener("resize", function() {
    // Recalculate width based on current container size
    const newWidth = getChartWidth("chart2");
    
    // No need for a threshold check, always redraw on resize for better responsiveness
    width = newWidth;
    
    // Clear existing charts
    d3.select("#chart2").selectAll("*").remove();
    d3.select("#chart3").selectAll("*").remove();
    
    // Remove tooltips
    d3.selectAll(".tooltip1").remove();
    d3.selectAll(".tooltip2").remove();
    
    // Recreate charts
    createScatterplot();
    createCumulativePlot();
    addSynchronizedEventListeners();
});