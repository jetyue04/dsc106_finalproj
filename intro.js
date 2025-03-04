let data = [];
let data1 = [];
const width = 1000;
const height = 600;
let xScale;
let yScale;

async function loadData(){
    data = await d3.csv('data/allfirstday.csv', (row) => ({
        ...row
    }));

    data1 = await d3.csv('data/favf.csv', (row) => ({
        ...row
    }));
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    console.log(data);
    createScatterplot();
    console.log(data);
});

function createScatterplot(){
    const margin = { top: 10, right: 10, bottom: 50, left: 50 };
    
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Define a color scale for different mouse groups

    xScale = d3
        .scaleTime()
        .domain([new Date(0, 0, 0, 0, 0), new Date(0, 0, 0, 23, 55)])  // 0-287 intervals, 24 hours
        .range([0, width]);

    yScale = d3
        .scaleLinear()
        .domain([35, 39])
        .range([height, 0]);

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%I:%M %p")); // Format as Time
    const yAxis = d3.axisLeft(yScale);

    const xGrid = d3.axisBottom(xScale)
        .tickSize(-usableArea.height)  // Extend ticks across the chart
        .tickFormat("");  // Remove labels

    const yGrid = d3.axisLeft(yScale)
        .tickSize(-usableArea.width) 
        .tickFormat("");  

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${usableArea.bottom})`)
        .call(xGrid);
    
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${usableArea.left}, 0)`)
        .call(yGrid);

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", usableArea.left + usableArea.width / 2)
        .attr("y", height + 30) // Move further below the x-axis
        .text("Time of Day")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    svg.append("text")  
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)") // Rotate for vertical orientation
        .attr("x", -usableArea.top - usableArea.height / 2)
        .attr("y", 0) // Adjusted position
        .text("Temperature (°C)")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis)
        .style('stroke-width', 2)
        .style('font-size', 14);



    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis)
        .style('stroke-width', 2)
        .style('font-size', 14);

    // Check if data is available and not empty
    
    const mouseGroups = d3.group(data, d => d.mouse);
        console.log("Mouse groups:", mouseGroups);

    const line = d3.line()
        .x(d => {
            const timeInMinutes = d.index;  // Convert to actual minutes
            return xScale(new Date(0, 0, 0, Math.floor(timeInMinutes / 60), timeInMinutes % 60));
        })
        .y(d => yScale(d.temp))
        // Add defined method to handle missing or invalid data points
    
    
        mouseGroups.forEach((values, mouse) => {
            const lineElement = svg.append('path')
                .datum(values)
                .attr('class', `line line-${mouse}`)
                .attr('d', line)
                .style('fill', 'none')
                .style('stroke', 'gray')
                .style('stroke-opacity', '0.3')
                .style('stroke-width', 4);
    
            // Add hover effect to bold the line on hover
            const tooltip = d3.select('#chart')
                                .append('div')
                                .attr('class', 'tooltip')
                                .style('position', 'absolute')
                                .style('visibility', 'hidden')
                                .style('background-color', 'rgba(0, 0, 0, 0.75)')
                                .style('color', 'white')
                                .style('padding', '8px')
                                .style('border-radius', '4px')
                                .style('font-size', '14px');
            lineElement
                .on('mouseover', function() {
                    let gender;
                    if (mouse.includes('m')){
                        gender = 'male'
                    }
                    else{
                        gender = 'female'
                    }
                    d3.select(this)
                        .style('stroke-width', 7)
                        .style('stroke', 'black')  // Make the line bold
                        .style('stroke-opacity', 1);  // Make the line fully visible
                    tooltip
                    .style('visibility', 'visible')
                    .text(`Mouse: ${mouse}, Gender: ${gender}`)
                    .style('left', `${event.pageX + 5}px`)
                    .style('top', `${event.pageY - 28}px`);
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .style('stroke-width', 4)
                        .style('stroke', 'gray')   // Reset the line width
                        .style('stroke-opacity', 0.3); // Reset opacity
                    tooltip.style('visibility', 'hidden');
                });
    });

    

    
}