d3.csv('https://raw.githubusercontent.com/sheriefAbdallah/CS318/refs/heads/main/Traffic_Incidents.csv')
    .then(data => {
        const hierarchyData = preprocessData(data);
        createTreemap(hierarchyData, data);
    });

    function preprocessData(data) {
        const grouped = d3.group(data, d => d['acci_name'].split(' - ').pop());
        const hierarchy = Array.from(grouped, ([key, values]) => ({
            key: key,
            value: values.length,
            details: values.map(d => parseInt(d['acci_x']))
        }));
    
        hierarchy.sort((a, b) => b.value - a.value);
        const topFive = hierarchy.slice(0, 5);
        return { name: "Root", children: topFive };
    }

function createTreemap(data, fullData) {
    const width = 800;
    const height = 705;

    const treemap = d3.treemap().size([width, height]).padding(4);
    const root = d3.hierarchy(data).sum(d => d.value);
    treemap(root);

    const colorScale = d3.scaleOrdinal()
        .domain(['بليغ', 'بسيط', 'مركبات مخالفة', 'حريق مركبة أثناء سيرها','عبور شخص أو عدة أشخاص من مكان غير مخصص لعبور المشا'])
        .range(['#34495e', '#1a3d6e', '#21618c', '#5d6d7e', '#7f8c8d']);

    const svg = d3.select("#treemap").append("svg")
        .attr("width", width)
        .attr("height", height);

    const nodes = svg.selectAll("g")
        .data(root.leaves())
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .on("click", function (event, d) {
            panAndFocus(this, nodes, width, height);
            showTimeDistribution(d.data.key, fullData);
            showResetButton(nodes, width, height);
            showPercentage(d, this); // Show the percentage on click
        });

    nodes.append("rect")
        .attr("class", "node")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => colorScale(d.data.key))
        .attr("rx", 10)
        .attr("ry", 10)
        .style("transition", "all 0.5s ease")
        .on("click", function(event, d) {
            if (d3.select("#subvisualization").classed("visible")) {
                resetTreemap(nodes, width, height);
                d3.select("#subvisualization").classed("visible", false);
                hideResetButton();
            } else {
                panAndFocus(this, nodes, width, height);
                showTimeDistribution(d.data.key, fullData);
                showResetButton(nodes, width, height);
                showPercentage(d, this); // Show the percentage on click
            }
        })
        .on("mouseover", function(event, d) {
            const originalColor = colorScale(d.data.key);
            d3.select(this).style("fill", d3.color(originalColor).brighter(1));
            tooltip.style("visibility", "visible")
                .html(d.data.key)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this).style("fill", colorScale(d.data.key));
            tooltip.style("visibility", "hidden");
        })
        .on("mousemove", function(event, d) { // Added for chase-the-mouse
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        });
        
        nodes.append("text")
        .attr("class", "node-text")
        .attr("x", d => (d.x1 - d.x0) / 2)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle")
        .text(d => d.data.key)
        .style("font-family", "'Roboto', sans-serif") // Modern font
        .style("font-weight", "bold") // Bold text for emphasis
        .style("font-size", d => Math.min(24, (d.x1 - d.x0) / 5, (d.y1 - d.y0) / 5) + "px")
        .style("fill", "white")
        .style("text-shadow", "2px 2px 4px rgba(0, 0, 0, 0.6)"); // Add shadow effect
    

    let resetButton = null;    

    function showResetButton(nodes, width, height) {
        if (resetButton) return;

        const resetContainer = d3.select("#treemap")
            .append("div")
            .attr("id", "reset-container")
            .style("text-align", "center")
            .style("margin-top", "-602px")
            .style("opacity", 0);

        resetButton = resetContainer.append("button")
            .text("Reset")
            .style("width", `${width}px`)
            .style("height", `${height}px`)
            .style("font-size", "24px")
            .style("border-radius", "5px")
            .style("background-color", "transparent")
            .style("color", "transparent")
            .style("border", "none")
            .style("cursor", "pointer")
            .on("click", () => {
                resetTreemap(nodes, width, height);
                hideResetButton();
            });
    }

    function hideResetButton() {
        if (resetButton) {
            d3.select("#reset-container").transition().style("opacity", 0).remove();
            resetButton = null;
        }
    }

    function showPercentage(d, clickedNode) {
        const total = d3.sum(root.leaves(), leaf => leaf.data.value);
        const percentage = ((d.value / total) * 100).toFixed(2);
    
        // Calculate the center of the treemap (SVG canvas)
        const centerX = width / 2;
        const centerY = height / 2;
    
        // Add the percentage text to the center of the entire treemap
        const percentageText = d3.select("#treemap svg").append("text")
            .attr("class", "percentage-text")
            .attr("x", centerX) // Center x of the whole treemap
            .attr("y", centerY - 20) // Slightly above the pie chart
            .attr("dominant-baseline", "middle") // Center vertically
            .attr("text-anchor", "middle") // Center horizontally
            .style("font-size", "32px") // Adjust size as needed
            .style("fill", "#fff")
            .style("opacity", 0) // Start with opacity 0 for fade-in effect
    
        // Animate the percentage text
        percentageText.transition()
        .text("0.00%") // Initial text value
            .transition()
            .duration(1000)
            .tween("text", function() {
                const that = d3.select(this);
                const i = d3.interpolateNumber(0, percentage);
                return function(t) {
                    that.text(`${i(t).toFixed(2)}%`);
                };
            })
            .duration(1000) // Duration of the fade-in
            .style("opacity", 1) // Fade in by changing opacity to 1
            .style("font-size", "48px"); // Optional: Scale the font size up
    
        // Create a hollow pie chart underneath the percentage
        const radius = 50; // Radius of the pie chart
        const pieData = [percentage, 100 - percentage]; // Data for the pie chart (percentage and the remaining)
    
        const arc = d3.arc()
            .innerRadius(radius - 10) // Make it a hollow pie chart by setting inner radius
            .outerRadius(radius);
    
        const pie = d3.pie()
            .sort(null) // No sorting of data
            .value(d => d); // Pie chart values
    
        const arcData = pie(pieData); // Get the arc data
    
        // Create a group for the pie chart
        const pieGroup = d3.select("#treemap svg").append("g")
            .attr("transform", `translate(${centerX - 5}, ${centerY + 60})`); // Lower the pie chart by changing the translateY value
    
        // Create the arc paths
        const arcs = pieGroup.selectAll(".arc")
            .data(arcData)
            .enter().append("path")
            .attr("class", "arc")
            .attr("d", arc)
            .style("fill", (d, i) => i === 0 ? "#3498db" : "#ecf0f1") // Blue for the filled part, light grey for the rest
            .style("opacity", 0) // Start with opacity 0 for fade-in effect
            .transition()
            .duration(1000) // Duration for the pie chart animation
            .attrTween("d", function(d) {
                const interpolateArc = d3.interpolate({startAngle: 0, endAngle: 0}, d);
                return function(t) {
                    return arc(interpolateArc(t));
                };
            })
            .style("opacity", 1); // Fade-in effect
    
        // Optional: Add a white stroke to the hollow effect
        arcs.style("stroke", "#fff")
            .style("stroke-width", "2px");
    
        // Fade in the entire pie chart group
        pieGroup.style("opacity", 0) // Start with opacity 0
            .transition()
            .duration(1000) // Duration for fade-in
            .style("opacity", 1); // Fade-in to opacity 1
    }       
    
    function resetTreemap(nodes, width, height) {
        nodes.transition()
            .duration(500)
            .attr("transform", d => `translate(${d.x0},${d.y0})`)
            .select("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .style("opacity", 1);
    
        nodes.selectAll("text.node-text")
            .transition()
            .duration(500)
            .attr("x", d => (d.x1 - d.x0) / 2)
            .attr("y", d => (d.y1 - d.y0) / 2)
            .style("opacity", 1);
    
        // Remove percentage text and pie chart when resetting
        d3.selectAll(".percentage-text")
            .transition()
            .duration(500)
            .style("opacity", 0) // Fade-out effect
            .remove(); // Remove the element after fade-out
    
        d3.selectAll(".arc")
            .transition()
            .duration(500)
            .style("opacity", 0) // Fade-out effect for the pie chart arcs
            .remove(); // Remove the pie chart after fade-out
    
        d3.select("#subvisualization").html("");
        d3.select("#subvisualization").classed("visible", false);
        
        // Reset any other UI elements related to the sub-visualization
        hideResetButton(); // Hide reset button after reset
    }
    

    function panAndFocus(clickedNode, allNodes, width, height) {
        const focusNode = d3.select(clickedNode.parentNode);

        allNodes.transition()
            .duration(500)
            .attr("transform", d => {
                if (d.data.key === clickedNode.__data__.data.key) {
                    return "translate(0, 0)";
                } else {
                    return "translate(1000, 0)";
                }
            })
            .select("rect")
            .attr("width", d => {
                if (d.data.key === clickedNode.__data__.data.key) {
                    return width;
                } else {
                    return 0;
                }
            })
            .attr("height", d => {
                if (d.data.key === clickedNode.__data__.data.key) {
                    return height;
                } else {
                    return 0;
                }
            });

        allNodes.selectAll("text.node-text")
            .transition()
            .duration(300)
            .style("opacity", d => {
                if (d.data.key === clickedNode.__data__.data.key) {
                    return 0;
                } else {
                    return 0;
                }
            })
            .attr("x", d => {
                if (d.data.key === clickedNode.__data__.data.key) {
                    return width / 2;
                } else {
                    return (d.x1 - d.x0) / 2;
                }
            })
            .attr("y", d => {
                if (d.data.key === clickedNode.__data__.data.key) {
                    return height / 2;
                } else {
                    return (d.y1 - d.y0) / 2;
                }
            });
    }
}

// Function to display the Time Distribution graph
function showTimeDistribution(severityType, fullData) {
    // Filter the data for the selected severity
    const parseTime = d3.timeParse("%d/%m/%Y %H:%M:%S");
    const filteredData = fullData.filter(d => d['acci_name'].split(' - ').pop() === severityType);
    
    // Extract and format the date part of the accident time
    const filteredDates = filteredData.map(d => d3.timeFormat("%B %Y")(parseTime(d['acci_time'])));

    // Specify the desired months and years
    const allowedMonths = [
        "March 2023", "April 2023", "March 2024", "April 2024",
        "June 2024", "July 2024", "August 2024", "September 2024"
    ].map(d => d3.timeFormat("%B %Y")(new Date(d)));

    // Filter for only the allowed months
    const filteredCounts = filteredDates.filter(date => allowedMonths.includes(date));

    // Count the occurrences of each allowed month
    const timeCounts = d3.rollup(
        filteredCounts,
        v => v.length, // Count incidents
        d => d // Group by "Month Year"
    );

    // Ensure all allowed months are present, even if count is zero
    const completeCounts = allowedMonths.map(month => ({
        date: month,
        count: timeCounts.get(month) || 0 // Default to 0 if no data for the month
    }));

    // Separate the dates and counts for the plot
    const dates = completeCounts.map(d => d.date);
    const counts = completeCounts.map(d => d.count);

    // Create the time distribution plot using Plotly
    const trace = {
        x: dates,
        y: counts,
        type: 'scatter',
        mode: 'lines+markers',
        name: `Accident Frequency Over Time`,
        line: { shape: 'linear', color: '#3498db' }, // Line color for consistency
        marker: { size: 8 }
    };

    const layout = {
        title: `Incidents Over Time for ${severityType}`,
        xaxis: {
            title: 'Month',
            tickangle: -45, // Tilt the labels for better readability
        },
        yaxis: {
            title: 'Incident Count',
        },
        margin: {
            t: 50, b: 100, l: 50, r: 30
        }
    };

    const config = { 
        displayModeBar: false,
    };

    // Initially hide the subvisualization container with a fade-out effect
    const container = d3.select("#subvisualization")
        .classed("visible", false);  // Remove the 'visible' class for fade-out

    // Delay the Plotly render until the fade-out transition is complete
    setTimeout(() => {
        // Render the new chart using Plotly
        Plotly.newPlot('subvisualization', [trace], layout, config);

        // Trigger the fade-in effect after the chart is rendered
        setTimeout(() => {
            container.classed("visible", true); // Add the 'visible' class to trigger the fade-in
        }, 50); // Delay to ensure rendering is complete before animation starts
    }, 500); // Match the fade-out duration (1s)
}


// Append the tooltip to the body
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(255, 255, 255, 0.95)") // Slightly more opaque background
    .style("color", "#333") // Keep dark text color for readability
    .style("padding", "12px 16px") // Increased padding for better spacing
    .style("border-radius", "10px") // Slightly more rounded corners
    .style("font-size", "15px") // Slightly larger font size
    .style("font-weight", "500") // Medium weight for better readability
    .style("font-family", "'Roboto', sans-serif") // Keep consistent font
    .style("line-height", "1.4") // Improved line height for better text flow
    .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.2)") // Softer and subtler shadow
    .style("border", "1px solid rgba(0, 0, 0, 0.1)") // Subtle border for contrast
    .style("transition", "all 0.1s ease") // Smooth transition
    .style("z-index", "9999"); // Ensure tooltip appears above other elements
