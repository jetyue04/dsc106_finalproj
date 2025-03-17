let data = [];
let data1 = [];
const width = 1000;
const height = 600;
let xScale;
let yScale;
let svg;
let originalXDomain;
let originalYDomain;

async function loadData(){
    data = await d3.csv('data/allfourday.csv', (row) => ({
        ...row
    }));

    data1 = await d3.csv('data/favf.csv', (row) => ({
        ...row
    }));
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createScatterplot();
});

function calculateStatistics(lineData) {
    // Convert temperatures to numbers and filter out any invalid data
    const temps = lineData
        .map(d => parseFloat(d.temp))
        .filter(temp => !isNaN(temp));

    // Calculate mean
    const mean = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;

    // Calculate standard deviation
    const variance = temps.reduce((sum, temp) => sum + Math.pow(temp - mean, 2), 0) / temps.length;
    const stdDev = Math.sqrt(variance);

    return { mean: mean.toFixed(2), stdDev: stdDev.toFixed(2) };
}

function createScatterplot(){
    const margin = { top: 10, right: 10, bottom: 50, left: 50 };
    
    // Create statistics display div
    const statsDisplay = d3.select('#stats-display')
        .style('border', '1px solid #ddd')
        .style('border-radius', '8px')
        .style('padding', '15px')
    
    svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible')
        .on('click', function(event) {
            // Check if the click is outside of any line
            if (event.target.tagName !== 'path') {
                resetZoom()

                statsDisplay.html(`
                    <strong>All Mice</strong> <br>
                    <strong>Mean Temperature:</strong> 36.94°C<br>
                    <strong>Standard Deviation:</strong> 0.8°C
                            
                `);
            }
        });

    xScale = d3
        .scaleLinear()  // Use linear scale instead of time scale
        .domain([0, 4 * 1440])  // 4 days, each with 1440 minutes

    yScale = d3
        .scaleLinear()
        .domain([35, 39.5])
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

    // Store original domains for reset
    originalXDomain = xScale.domain();
    originalYDomain = yScale.domain();

    // const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%I:%M %p"));
    const xAxis = d3.axisBottom(xScale)
        .tickValues([0, 1440, 2880, 4320])  // One tick per day
        .tickFormat((d, i) => `Day ${i + 1}`);
    const yAxis = d3.axisLeft(yScale);

    const xGrid = d3.axisBottom(xScale)
        .tickSize(-usableArea.height)
        .tickFormat("");

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

    // Axis labels
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", usableArea.left + usableArea.width / 2)
        .attr("y", height + 30)
        .text("Time of Day")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    svg.append("text")  
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -usableArea.top - usableArea.height / 2)
        .attr("y", 0)
        .text("Temperature (°C)")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis)
        .style('stroke-width', 2)
        .style('font-size', 14);

    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis)
        .style('stroke-width', 2)
        .style('font-size', 14);

    const mouseGroups = d3.group(data, d => d.mouse);
    
    // Group data by gender
    const maleData = [];
    const femaleData = [];
    
    // Process the data to separate by gender and prepare for mean calculation
    mouseGroups.forEach((values, mouse) => {
        if(mouse.includes('m')) {
            values.forEach(d => maleData.push({
                index: parseFloat(d.index),
                temp: parseFloat(d.temp)
            }));
        } else {
            values.forEach(d => femaleData.push({
                index: parseFloat(d.index),
                temp: parseFloat(d.temp)
            }));
        }
    });
    
    // Function to calculate mean temperature at each time point
    function calculateMeanByTimepoint(data) {
        const groupedByTime = d3.group(data, d => d.index);
        const meanData = [];
        
        groupedByTime.forEach((points, timepoint) => {
            const validTemps = points
                .map(p => p.temp)
                .filter(temp => !isNaN(temp));
                
            if(validTemps.length > 0) {
                const meanTemp = validTemps.reduce((sum, temp) => sum + temp, 0) / validTemps.length;
                meanData.push({
                    index: parseFloat(timepoint),
                    temp: meanTemp
                });
            }
        });
        
        // Sort by index to ensure proper line drawing
        meanData.sort((a, b) => a.index - b.index);
        return meanData;
    }
    
    // Calculate mean data for males and females
    const maleMeanData = calculateMeanByTimepoint(maleData);
    const femaleMeanData = calculateMeanByTimepoint(femaleData);

    const line = d3.line()
        .x(d => xScale(d.index))  // Use index directly (minutes)
        .y(d => yScale(d.temp))
        .defined(d => d.temp !== undefined && d.temp !== null);
    
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

    // Draw individual mouse lines
    mouseGroups.forEach((values, mouse) => {
        let gender = mouse.includes('m') ? 'male' : 'female';
        let color = mouse.includes('m') ? 'lightblue' : 'pink';
        const lineElement = svg.append('path')
            .datum(values)
            .attr('class', `line line-${mouse} ${gender}-line`)
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', color)
            .style('stroke-opacity', '0.3')
            .style('stroke-width', 3)
            .style('cursor', 'pointer')
            .attr('data-color', color)  // Store the color as a data attribute
            .on('click', function(event) {
                // Prevent event from bubbling to parent SVG
                event.stopPropagation();
                
                // Calculate and display statistics
                const stats = calculateStatistics(values);
                statsDisplay
                    .html(`
                        <strong>Mouse: ${mouse}</strong><br>
                        <strong>Mean Temperature:</strong> ${stats.mean}°C<br>
                        <strong>Standard Deviation:</strong> ${stats.stdDev}°C
                    `)
                
                // Zoom in on clicked line
                zoomToLine(values, mouse);
            })
            .on('mouseover', function() {
                d3.select(this)
                    .style('stroke-width', 5)
                    .style('stroke', color)
                    .style('stroke-opacity', 1);
                tooltip
                    .style('visibility', 'visible')
                    .text(`Mouse: ${mouse}, Gender: ${gender}`)
                    .style('left', `${event.pageX + 5}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', function() {
                // Only reduce opacity if not in zoomed state
                if (!d3.select(this).classed('zoomed')) {
                    d3.select(this)
                        .style('stroke-width', 3)
                        .style('stroke', color)
                        .style('stroke-opacity', 0.3);
                }
                tooltip.style('visibility', 'hidden');
            });
    });
    
    // Draw male mean line
    svg.append('path')
        .datum(maleMeanData)
        .attr('class', 'mean-line male-mean-line')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', '#4682B4')  // Darker blue for male mean
        .style('stroke-width', 4)
        .style('stroke-dasharray', '0')  // Solid line
        .style('opacity', 0.8);
        
    // Draw female mean line
    svg.append('path')
        .datum(femaleMeanData)
        .attr('class', 'mean-line female-mean-line')
        .attr('d', line)
        .style('fill', 'none')
        .style('stroke', '#E07B89')  // Darker pink/purple for female mean
        .style('stroke-width', 4)
        .style('stroke-dasharray', '0')  // Solid line
        .style('opacity', 0.8);

    function zoomToLine(lineData, mouse) {
        // Hide all lines
        svg.selectAll('.line')
            .style('display', 'none')
            .classed('zoomed', false);
            
        // Hide mean lines
        svg.selectAll('.mean-line')
            .style('display', 'none');

        // Show only the clicked line
        const selectedLine = svg.select(`.line-${mouse}`)
            .style('display', 'block')
            .style('stroke-width', 5)
            .style('stroke-opacity', 1)
            .classed('zoomed', true);

        // Calculate min and max temp for y-axis
        const temps = lineData.map(d => parseFloat(d.temp));
        const minTemp = Math.max(35, Math.min(...temps) - 0.5);
        const maxTemp = Math.min(39.5, Math.max(...temps) + 0.5);

        // Calculate min and max time for x-axis
        const times = lineData.map(d => d.index);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times); 

        // Update scales
        xScale.domain([minTime, maxTime]);
        yScale.domain([minTemp, maxTemp]);

        // Redraw axes
        svg.select('.x-axis')
            .transition()
            .duration(500)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => {
                    const day = Math.floor(d / (24 * 60)) + 1;
                    return `Day ${day}`;
                })
                .tickValues([0, 1440, 2880, 4320]));  // Only one tick per day

        svg.select('.y-axis')
            .transition()
            .duration(500)
            .call(d3.axisLeft(yScale));

        // Redraw the line with new scales
        const updatedLine = d3.line()
            .x(d => xScale(d.index))
            .y(d => yScale(d.temp));

        svg.select(`.line-${mouse}`)
            .transition()
            .duration(500)
            .attr('d', updatedLine(lineData));
    }
    
    const svgWidth = svg.attr('width');
    const svgHeight = svg.attr('height');

    // Append a group element for the legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(1000, 20)`);

    // Add Male Legend item (lightblue)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 20)
        .attr('height', 20)
        .style('fill', 'lightblue') // Color for Male
        .style('cursor', 'pointer') // Make it clickable
        .on('click', () => toggleVisibility('male')); // Toggle visibility on click

    // Add Male label next to the rectangle
    legend.append('text')
        .attr('x', 30)
        .attr('y', 15)
        .text('Male')
        .style('cursor', 'pointer')
        .on('click', () => toggleVisibility('male')); // Toggle visibility on click

    // Add Male Mean Legend item (blue)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 60)
        .attr('width', 20)
        .attr('height', 20)
        .style('fill', '#4682B4') // Color for Male Mean
        .style('cursor', 'pointer'); // Make it clickable

    // Add Male Mean label
    legend.append('text')
        .attr('x', 30)
        .attr('y', 75)
        .text('Male Mean')
        .style('cursor', 'pointer');

    // Add Female Legend item (pink)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 30)
        .attr('width', 20)
        .attr('height', 20)
        .style('fill', 'pink') // Color for Female
        .style('cursor', 'pointer') // Make it clickable
        .on('click', () => toggleVisibility('female')); // Toggle visibility on click

    // Add Female label next to the rectangle
    legend.append('text')
    // Add Female label next to the rectangle
    legend.append('text')
        .attr('x', 30)
        .attr('y', 45)
        .text('Female')
        .style('cursor', 'pointer')
        .on('click', () => toggleVisibility('female')); // Toggle visibility on click

    // Add Female Mean Legend item (darkmagenta)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 90)
        .attr('width', 20)
        .attr('height', 20)
        .style('fill', '#E07B89') // Color for Female Mean
        .style('cursor', 'pointer'); // Make it clickable

    // Add Female Mean label
    legend.append('text')
        .attr('x', 30)
        .attr('y', 105)
        .text('Female Mean')
        .style('cursor', 'pointer');

    // Function to toggle visibility of mouse lines by gender
    function toggleVisibility(gender) {
        const currentOpacity = svg.selectAll(`.${gender}-line`).style('stroke-opacity');
        const newOpacity = currentOpacity === '0.3' ? '0' : '0.3';
        
        svg.selectAll(`.${gender}-line`)
            .style('stroke-opacity', newOpacity)
            .style('display', newOpacity === '0' ? 'none' : 'block');
            
        // Also toggle mean lines
        if (gender === 'male') {
            const meanLineOpacity = svg.select('.male-mean-line').style('opacity');
            svg.select('.male-mean-line')
                .style('opacity', meanLineOpacity === '0.8' ? '0' : '0.8')
                .style('display', meanLineOpacity === '0.8' ? 'none' : 'block');
        } else {
            const meanLineOpacity = svg.select('.female-mean-line').style('opacity');
            svg.select('.female-mean-line')
                .style('opacity', meanLineOpacity === '0.8' ? '0' : '0.8')
                .style('display', meanLineOpacity === '0.8' ? 'none' : 'block');
        }
    }

    // Add reset button
    const resetButton = d3.select('#controls')
        .append('button')
        .attr('id', 'reset-zoom')
        .text('Reset View')
        .style('margin', '10px')
        .style('padding', '8px 16px')
        .style('border-radius', '4px')
        .style('background-color', '#f0f0f0')
        .style('border', '1px solid #ccc')
        .style('cursor', 'pointer')
        .on('click', resetZoom);

    // Display initial statistics for all mice
    statsDisplay.html(`
        <strong>All Mice</strong> <br>
        <strong>Mean Temperature:</strong> 36.94°C<br>
        <strong>Standard Deviation:</strong> 0.8°C
    `);

    function resetZoom() {
        // Show all lines again
        svg.selectAll('.line')
            .style('display', 'block')
            .style('stroke-opacity', 0.3)
            .style('stroke-width', 3)
            .classed('zoomed', false)
            .each(function() {
                const originalColor = d3.select(this).attr('data-color');
                d3.select(this).style('stroke', originalColor);
            });
            
        // Show mean lines again
        svg.selectAll('.mean-line')
            .style('display', 'block')
            .style('opacity', 0.8);

        // Reset scales to original domains
        xScale.domain(originalXDomain);
        yScale.domain(originalYDomain);

        // Redraw axes
        svg.select('.x-axis')
            .transition()
            .duration(500)
            .call(d3.axisBottom(xScale)
                .tickValues([0, 1440, 2880, 4320])
                .tickFormat((d, i) => `Day ${i + 1}`));

        svg.select('.y-axis')
            .transition()
            .duration(500)
            .call(d3.axisLeft(yScale));

        // Redraw lines with original domains  
        const updatedLine = d3.line()
            .x(d => xScale(d.index))
            .y(d => yScale(d.temp))
            .defined(d => d.temp !== undefined && d.temp !== null);

        mouseGroups.forEach((values, mouse) => {
            svg.select(`.line-${mouse}`)
                .transition()
                .duration(500)
                .attr('d', updatedLine(values));
        });
        
        // Redraw mean lines
        svg.select('.male-mean-line')
            .transition()
            .duration(500)
            .attr('d', updatedLine(maleMeanData));
            
        svg.select('.female-mean-line')
            .transition()
            .duration(500)
            .attr('d', updatedLine(femaleMeanData));
    }
    
    // Add favorite functionality
    const favoriteButton = d3.select('#controls')
        .append('button')
        .attr('id', 'toggle-favorite')
        .text('Show Favorites Only')
        .style('margin', '10px')
        .style('padding', '8px 16px')
        .style('border-radius', '4px')
        .style('background-color', '#f0f0f0')
        .style('border', '1px solid #ccc')
        .style('cursor', 'pointer')
        .on('click', toggleFavorites);
        
    let showingFavorites = false;
    
    function toggleFavorites() {
        if (!showingFavorites) {
            // Hide all lines
            svg.selectAll('.line')
                .style('display', 'none');
                
            // Show only favorite mice
            data1.forEach(favMouse => {
                svg.select(`.line-${favMouse.mouse}`)
                    .style('display', 'block')
                    .style('stroke-opacity', 0.8)
                    .style('stroke-width', 4);
            });
            
            // Hide mean lines
            svg.selectAll('.mean-line')
                .style('display', 'none');
                
            favoriteButton.text('Show All Mice');
            showingFavorites = true;
        } else {
            resetZoom();
            favoriteButton.text('Show Favorites Only');
            showingFavorites = false;
        }
    }
    
    // Add gender filter controls
    const genderFilter = d3.select('#controls')
        .append('div')
        .style('margin', '10px')
        .style('display', 'inline-block');
        
    genderFilter.append('label')
        .text('Filter by Gender: ')
        .style('margin-right', '10px');
        
    genderFilter.append('label')
        .text('Male ')
        .append('input')
        .attr('type', 'checkbox')
        .attr('id', 'male-filter')
        .attr('checked', true)
        .on('change', updateGenderFilter);
        
    genderFilter.append('label')
        .text(' Female ')
        .append('input')
        .attr('type', 'checkbox')
        .attr('id', 'female-filter')
        .attr('checked', true)
        .on('change', updateGenderFilter);
        
    function updateGenderFilter() {
        const showMale = d3.select('#male-filter').property('checked');
        const showFemale = d3.select('#female-filter').property('checked');
        
        // Update male lines visibility
        svg.selectAll('.male-line')
            .style('display', showMale ? 'block' : 'none');
            
        // Update female lines visibility
        svg.selectAll('.female-line')
            .style('display', showFemale ? 'block' : 'none');
            
        // Update mean lines
        svg.select('.male-mean-line')
            .style('display', showMale ? 'block' : 'none');
            
        svg.select('.female-mean-line')
            .style('display', showFemale ? 'block' : 'none');
    }
}